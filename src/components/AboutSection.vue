<script setup>
/**
 * 「关于我」+「我的技能」。
 * 原生版里技能是嵌在关于区块里的一个 <div data-section="skills">，
 * 这里保持同样的层级——两个区块在云端是分开存的，但页面上属于同一段叙述。
 */
defineProps({
    about: { type: Object, required: true },
    skills: { type: Object, required: true }
});
</script>

<template>
    <section class="about section fade-in-section" id="about" v-fade-in>
        <div class="container">
            <div class="about-content">
                <h2 class="section-title">关于我</h2>
                <div id="aboutView">
                    <p>{{ about.lead }}</p>
                    <p>{{ about.more }}</p>

                    <h3>我的技能</h3>
                    <ul v-if="skills.items && skills.items.length" class="skills-list">
                        <li v-for="tag in skills.items" :key="tag">{{ tag }}</li>
                    </ul>
                </div>
            </div>
        </div>
    </section>
</template>
