<script setup>
/**
 * 首页。各区块的数据来自全局 store，云端内容回来后自动重渲染。
 *
 * 区块顺序与原生版一致；空间与好东西一条都没有时整块不渲染（v-if 在各自组件里），
 * 不会留一块空招牌。
 */
import { onMounted, onBeforeUnmount } from 'vue';
import { loadSections, useContent } from './composables/useContent';
import { installAnchorScroll } from './composables/useAnchors';
import SiteHeader from './components/SiteHeader.vue';
import HeroSection from './components/HeroSection.vue';
import AboutSection from './components/AboutSection.vue';
import SpacesSection from './components/SpacesSection.vue';
import LinksSection from './components/LinksSection.vue';
import ContactSection from './components/ContactSection.vue';
import SiteFooter from './components/SiteFooter.vue';
import AdminPanel from './components/AdminPanel.vue';

const content = useContent();

let removeAnchorScroll = null;

onMounted(async () => {
    removeAnchorScroll = installAnchorScroll();
    // 云端拿不到就沿用默认内容，页面不会白屏，也不谎报成功
    await loadSections();
});

onBeforeUnmount(() => {
    if (removeAnchorScroll) removeAnchorScroll();
});
</script>

<template>
    <a class="skip-link" href="#main">跳到主要内容</a>

    <SiteHeader />

    <main id="main">
        <HeroSection :data="content.sections.hero" />
        <AboutSection :about="content.sections.about" :skills="content.sections.skills" />
        <SpacesSection :spaces="content.sections.spaces" />
        <LinksSection :links="content.sections.links" />
        <ContactSection :contact="content.sections.contact" />
    </main>

    <SiteFooter :footer="content.sections.footer" :contact="content.sections.contact" />

    <AdminPanel />
</template>
