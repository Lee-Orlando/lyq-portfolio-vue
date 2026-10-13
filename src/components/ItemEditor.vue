<script setup>
/**
 * 列表区块里的一条（一个空间，或一条好东西）。
 * 空间的特别之处是它内部还有一层：按顺序堆的文字块和图片块。
 */
import { emptyBlock, MAX_BLOCKS_PER_SPACE } from '../content/schema';
import FieldControl from './FieldControl.vue';
import BlockEditor from './BlockEditor.vue';

const props = defineProps({
    section: { type: Object, required: true },
    item: { type: Object, required: true },
    index: { type: Number, required: true },
    total: { type: Number, required: true },
    endpoint: { type: String, default: '' }
});

const emit = defineEmits(['remove', 'move', 'notify']);

const blocks = () => (Array.isArray(props.item.blocks) ? props.item.blocks : []);

function addBlock(kind) {
    if (blocks().length >= MAX_BLOCKS_PER_SPACE) {
        emit('notify', { message: `一个空间最多 ${MAX_BLOCKS_PER_SPACE} 块内容。`, tone: 'error' });
        return;
    }
    blocks().push(emptyBlock(kind));
}

function removeBlock(order) {
    blocks().splice(order, 1);
}

function moveBlock(order, delta) {
    const list = blocks();
    const target = order + delta;
    if (target < 0 || target >= list.length) return;
    [list[order], list[target]] = [list[target], list[order]];
}
</script>

<template>
    <div class="item-editor" :data-item="index">
        <div class="item-editor-head">
            <span class="item-index">
                {{ index + 1 }}. {{ item.name || `未命名${section.list.label}` }}
            </span>
            <div class="item-controls">
                <button
                    type="button"
                    class="icon-button"
                    :disabled="index === 0"
                    :aria-label="`把第 ${index + 1} 条上移`"
                    @click="emit('move', -1)"
                >↑</button>
                <button
                    type="button"
                    class="icon-button"
                    :disabled="index === total - 1"
                    :aria-label="`把第 ${index + 1} 条下移`"
                    @click="emit('move', 1)"
                >↓</button>
                <button
                    type="button"
                    class="icon-button is-danger"
                    :aria-label="`删除第 ${index + 1} 条`"
                    @click="emit('remove')"
                >删除</button>
            </div>
        </div>

        <FieldControl
            v-for="field in section.list.fields"
            :key="field.name"
            v-model="item[field.name]"
            :field="field"
            :index="index"
        />

        <template v-if="section.list.blocks">
            <div class="block-editor-list">
                <BlockEditor
                    v-for="(block, order) in item.blocks"
                    :key="order"
                    :block="block"
                    :order="order"
                    :total="item.blocks.length"
                    :endpoint="endpoint"
                    @remove="removeBlock(order)"
                    @move="(delta) => moveBlock(order, delta)"
                    @notify="(payload) => emit('notify', payload)"
                />
            </div>
            <div class="block-actions">
                <button type="button" class="ghost-button" @click="addBlock('text')">+ 加一段文字</button>
                <button type="button" class="ghost-button" @click="addBlock('image')">+ 加一张图片</button>
            </div>
        </template>
    </div>
</template>
