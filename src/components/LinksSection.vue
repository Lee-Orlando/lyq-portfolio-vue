<script setup>
/** 好东西：站外网址收藏，一条都没有时整块隐藏 */
import LinkCard from './LinkCard.vue';

defineProps({
    links: { type: Object, required: true }
});
</script>

<template>
    <section
        v-if="links.items && links.items.length"
        class="links section fade-in-section"
        id="links"
        v-fade-in
    >
        <div class="container">
            <h2 class="section-title">好东西</h2>
            <p class="links-intro">我做的其他东西，和我喜欢的东西。</p>
            <div class="links-list">
                <LinkCard v-for="(link, index) in links.items" :key="index" :link="link" />
            </div>
        </div>
    </section>
</template>
