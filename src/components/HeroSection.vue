<script setup>
import ParticleField from './ParticleField.vue';

defineProps({
    data: { type: Object, required: true }
});
</script>

<template>
    <section class="hero section" id="hero">
        <div class="hero-background"></div>
        <ParticleField />
        <div class="hero-content">
            <h1>{{ data.title }}</h1>
            <p>{{ data.subtitle }}</p>
            <a href="#about" class="cta-button">{{ data.ctaText }}</a>
        </div>
    </section>
</template>
