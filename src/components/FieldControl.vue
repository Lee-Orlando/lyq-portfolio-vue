<script setup>
/**
 * 一个字段的编辑控件。形态由 schema 里的 type 决定：text / textarea / tags。
 *
 * 输入时存原样、失焦时才 trim：如果每次按键都把首尾空格削掉再写回，
 * Vue 会把输入框的 value 重设一遍，光标会跳到末尾，打一个词就断一次。
 */
import { computed } from 'vue';
import { parseTags, slugify, tagsToText } from '../content/utils';

const props = defineProps({
    field: { type: Object, required: true },
    modelValue: { type: [String, Array], default: '' },
    /** 序号，用于「还没填短名，网址会排成 s1」这类提示 */
    index: { type: Number, default: 0 }
});

const emit = defineEmits(['update:modelValue']);

const isTags = computed(() => props.field.type === 'tags');
const isTextarea = computed(() => props.field.type === 'textarea');

/** 输入框里显示什么：tags 要摊平成顿号分隔的字符串 */
const display = computed(() => (isTags.value ? tagsToText(props.modelValue) : String(props.modelValue ?? '')));

function push(value) {
    emit('update:modelValue', isTags.value ? parseTags(value) : value);
}

function onInput(event) {
    push(event.target.value);
}

function onChange(event) {
    const raw = event.target.value;
    // 短名当场收敛成合法值并在输入框里显示出来，让用户看见自己到底拿到了什么
    if (props.field.name === 'slug') {
        const cleaned = slugify(raw);
        event.target.value = cleaned;
        emit('update:modelValue', cleaned);
        return;
    }
    push(isTags.value ? raw : raw.trim());
}

/** 短名这类字段把「最终会变成什么网址」直接摊开，免得填完不知道拿到哪个链接 */
const preview = computed(() => {
    if (!props.field.preview) return '';
    const slug = slugify(props.modelValue);
    return slug
        ? `这个空间的网址：space.html?space=${slug}`
        : `还没填短名，网址会按序号排成 s${props.index + 1}`;
});
</script>

<template>
    <div class="form-group">
        <label :for="`f-${field.name}-${index}`">{{ field.label }}</label>

        <textarea
            v-if="isTextarea"
            :id="`f-${field.name}-${index}`"
            :value="display"
            :rows="field.rows || 3"
            :maxlength="field.max || 500"
            :placeholder="field.placeholder || ''"
            @input="onInput"
            @change="onChange"
        ></textarea>

        <input
            v-else
            :id="`f-${field.name}-${index}`"
            :type="field.url ? 'url' : 'text'"
            :value="display"
            autocomplete="off"
            :maxlength="field.max || 500"
            :placeholder="field.placeholder || ''"
            @input="onInput"
            @change="onChange"
        >

        <span v-if="field.hint" class="field-hint">{{ field.hint }}</span>
        <span v-if="field.preview" class="field-hint is-link" :data-slug-preview="field.name">{{ preview }}</span>
    </div>
</template>
