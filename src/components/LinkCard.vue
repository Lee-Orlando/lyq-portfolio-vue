<script setup>
/**
 * 「好东西」里的一格：整块是外链，新标签页打开。
 * 格子上写目标域名——点之前就该知道会跳到别的站，别让人以为是站内页面。
 */
import { computed } from 'vue';
import { hostOf, safeUrl } from '../content/utils';

const props = defineProps({
    link: { type: Object, required: true }
});

const url = computed(() => safeUrl(props.link.url));
const name = computed(() => String(props.link.name || '').trim() || (url.value ? hostOf(url.value) : '未命名'));
const note = computed(() => String(props.link.note || '').trim());
</script>

<template>
    <a
        class="link-card"
        :href="url || '#'"
        target="_blank"
        rel="noopener noreferrer"
        :aria-label="`在新标签页打开：${name}`"
    >
        <h3 class="link-title">{{ name }}</h3>
        <p v-if="note" class="link-note">{{ note }}</p>
        <span class="space-cue is-external">{{ hostOf(url) }} ↗</span>
    </a>
</template>
