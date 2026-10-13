<script setup>
/**
 * 一个空间内部的一块内容：文字块或图片块。
 * 可以上下移动、删除；图片块还能选图上传。
 *
 * 上传成功后只把返回的 CDN 地址写进 block.url —— 图片本身不进内容 JSON，
 * base64 会让体积膨胀三分之一，内容文件迟早被撑爆。
 */
import { computed } from 'vue';
import { safeUrl } from '../content/utils';
import { IMAGE_MIME_TYPES, MAX_IMAGE_BYTES } from '../content/schema';
import { uploadImage } from '../content/api';

const props = defineProps({
    block: { type: Object, required: true },
    order: { type: Number, required: true },
    total: { type: Number, required: true },
    endpoint: { type: String, default: '' }
});

const emit = defineEmits(['remove', 'move', 'notify']);

const previewUrl = computed(() => safeUrl(props.block.url));

async function onPickFile(event) {
    const picker = event.target;
    const file = picker.files && picker.files[0];
    // 清掉才能重复选同一个文件，否则第二次选它不会再触发 change
    picker.value = '';
    if (!file) return;

    if (!IMAGE_MIME_TYPES.includes(file.type)) {
        emit('notify', { message: '只支持 PNG / JPG / GIF / WebP 图片。', tone: 'error' });
        return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
        emit('notify', {
            message: `这张图 ${(file.size / 1024 / 1024).toFixed(2)}MB，超过 2MB 上限，先压缩一下。`,
            tone: 'error'
        });
        return;
    }
    if (!props.endpoint) {
        emit('notify', { message: '还没配置 content-endpoint，图片没地方存。', tone: 'error' });
        return;
    }

    emit('notify', { message: '图片上传中…', tone: '' });
    try {
        const url = await uploadImage(props.endpoint, file);
        props.block.url = url;
        emit('notify', { message: '图片已上传，记得点保存。', tone: 'success' });
    } catch (error) {
        emit('notify', { message: error.message || '图片上传失败，重试一次试试。', tone: 'error' });
    }
}
</script>

<template>
    <div class="block-editor" :data-block="order">
        <div class="block-head">
            <span class="block-kind" :class="`is-${block.type}`">{{ block.type === 'image' ? '图片' : '文字' }}</span>
            <div class="item-controls">
                <button
                    type="button"
                    class="icon-button"
                    :disabled="order === 0"
                    aria-label="把这块内容上移"
                    @click="emit('move', -1)"
                >↑</button>
                <button
                    type="button"
                    class="icon-button"
                    :disabled="order === total - 1"
                    aria-label="把这块内容下移"
                    @click="emit('move', 1)"
                >↓</button>
                <button
                    type="button"
                    class="icon-button is-danger"
                    aria-label="删除这块内容"
                    @click="emit('remove')"
                >删除</button>
            </div>
        </div>

        <div class="form-group">
            <label :for="`b-${block.type}-${order}`">第 {{ order + 1 }} 块{{ block.type === 'image' ? '图片' : '文字' }}</label>

            <textarea
                v-if="block.type !== 'image'"
                :id="`b-text-${order}`"
                :value="block.value"
                rows="3"
                maxlength="2000"
                @input="block.value = $event.target.value"
                @change="block.value = $event.target.value.trim()"
            ></textarea>

            <template v-else>
                <input
                    :id="`b-img-${order}`"
                    type="file"
                    class="block-file"
                    :accept="IMAGE_MIME_TYPES.join(',')"
                    @change="onPickFile"
                >
                <!-- 已经传过的图把缩略图摆出来，才知道这块到底放了什么 -->
                <img
                    v-if="previewUrl"
                    class="block-preview"
                    :src="previewUrl"
                    :alt="block.alt || '已上传的图片'"
                >
                <label :for="`b-img-${order}-alt`">图片说明（会显示在图下方，可留空）</label>
                <input
                    :id="`b-img-${order}-alt`"
                    type="text"
                    maxlength="120"
                    autocomplete="off"
                    placeholder="例如：凌晨四点的自习室"
                    :value="block.alt"
                    @input="block.alt = $event.target.value"
                    @change="block.alt = $event.target.value.trim()"
                >
                <span v-if="previewUrl" class="field-hint">{{ previewUrl }}</span>
            </template>
        </div>
    </div>
</template>
