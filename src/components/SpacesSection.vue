<script setup>
/**
 * 自建空间：没有固定标题，也不预设数量。
 * 管理员建几个这里就出现几格；一个都没有时整块隐藏，不留空招牌。
 */
import SpaceCard from './SpaceCard.vue';

defineProps({
    spaces: { type: Object, required: true }
});
</script>

<template>
    <section
        v-if="spaces.items && spaces.items.length"
        class="spaces section fade-in-section"
        id="spaces"
        v-fade-in
    >
        <div class="container">
            <div class="spaces-list">
                <SpaceCard
                    v-for="(space, index) in spaces.items"
                    :key="index"
                    :space="space"
                    :index="index"
                />
            </div>
        </div>
    </section>
</template>
