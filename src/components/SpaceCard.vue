<script setup>
/**
 * 九宫格里的一个空间。整格是链接，点进去是这个空间自己的页面。
 * 格子里只放封面图 + 名字 + 一句摘要——完整内容在 space.html 展开，
 * 否则卡片高矮不一，网格会散。
 */
import { computed } from 'vue';
import { excerpt, safeUrl, spaceHref } from '../content/utils';

const props = defineProps({
    space: { type: Object, required: true },
    index: { type: Number, default: 0 }
});

const blocks = computed(() => (Array.isArray(props.space.blocks) ? props.space.blocks : []));
const name = computed(() => String(props.space.name || '').trim() || '未命名空间');
const href = computed(() => spaceHref(props.space, props.index));

const cover = computed(() => {
    const hit = blocks.value.find((block) => block && block.type === 'image' && safeUrl(block.url));
    return hit ? safeUrl(hit.url) : '';
});

const coverAlt = computed(() => {
    const hit = blocks.value.find((block) => block && block.type === 'image' && safeUrl(block.url));
    return hit ? String(hit.alt || '') : '';
});

const summary = computed(() => {
    const hit = blocks.value.find((block) => block && block.type === 'text' && String(block.value || '').trim());
    return hit ? excerpt(hit.value, 60) : '';
});
</script>

<template>
    <a class="space-card" :href="href" :aria-label="`打开空间：${name}`">
        <div v-if="cover" class="space-cover">
            <img :src="cover" :alt="coverAlt" loading="lazy" decoding="async">
        </div>
        <h3 class="space-title">{{ name }}</h3>
        <p v-if="summary" class="space-excerpt">{{ summary }}</p>
        <span class="space-cue">进入 →</span>
    </a>
</template>
