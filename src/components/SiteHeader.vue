<script setup>
/**
 * 吸顶导航：滚动后加 .scrolled，同时按当前滚动位置高亮对应菜单项。
 * 移动端由汉堡按钮开合，Esc 与点击外部都能关。
 */
import { onMounted, onBeforeUnmount, ref } from 'vue';

const NAV = [
    { id: 'hero', label: '首页' },
    { id: 'about', label: '关于' },
    { id: 'contact', label: '联系' }
];

const scrolled = ref(false);
const activeId = ref('hero');
const menuOpen = ref(false);
const headerEl = ref(null);

let ticking = false;

function closeMenu() {
    menuOpen.value = false;
}

function toggleMenu() {
    menuOpen.value = !menuOpen.value;
}

function updateState() {
    scrolled.value = window.scrollY > 50;

    const header = headerEl.value;
    const triggerY = window.scrollY + (header ? header.offsetHeight : 0) + 20;
    let current = NAV[0].id;
    NAV.forEach((item) => {
        const section = document.getElementById(item.id);
        // 隐藏的区块（比如一个空间都没有时的 #spaces）不参与高亮
        if (section && !section.hidden && section.offsetTop <= triggerY) current = item.id;
    });
    activeId.value = current;
}

function onScroll() {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(() => {
        updateState();
        ticking = false;
    });
}

function onKeydown(event) {
    if (event.key === 'Escape' && menuOpen.value) closeMenu();
}

onMounted(() => {
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    document.addEventListener('keydown', onKeydown);
    updateState();
});

onBeforeUnmount(() => {
    window.removeEventListener('scroll', onScroll);
    window.removeEventListener('resize', onScroll);
    document.removeEventListener('keydown', onKeydown);
});
</script>

<template>
    <header id="mainHeader" ref="headerEl" class="main-header" :class="{ scrolled }">
        <div class="container">
            <a href="#hero" class="logo">Lyq</a>

            <nav id="mainNav" class="main-nav" :class="{ active: menuOpen }" aria-label="主导航">
                <ul>
                    <li v-for="item in NAV" :key="item.id">
                        <a
                            :href="`#${item.id}`"
                            :class="{ active: activeId === item.id }"
                            :aria-current="activeId === item.id ? 'true' : null"
                            @click="closeMenu"
                        >{{ item.label }}</a>
                    </li>
                </ul>
            </nav>

            <button
                type="button"
                id="hamburger"
                class="hamburger"
                :class="{ active: menuOpen }"
                aria-controls="mainNav"
                :aria-expanded="String(menuOpen)"
                :aria-label="menuOpen ? '关闭导航菜单' : '打开导航菜单'"
                @click="toggleMenu"
            >
                <span class="line"></span>
                <span class="line"></span>
                <span class="line"></span>
            </button>
        </div>
    </header>
</template>
