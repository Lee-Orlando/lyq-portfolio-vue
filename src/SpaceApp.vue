<script setup>
/**
 * 单个空间的展示页 + 就地编辑器（space.html）。
 *
 * 页面做两件事：
 *   1. 按 ?space=短名 从云端取回 spaces 区块，找出对应空间，按顺序渲染文字块和图片块。
 *   2. 提供这个空间自己的编辑器——改名字、加文字、传图片、排序，保存只回写这一个空间。
 *
 * 为什么不做成「点编辑跳回首页的抽屉面板」：站在这里改，看到的排版就是访客看到的排版，
 * 不用在抽屉里想象图片会落在哪。首页那个抽屉依然管整站文案和空间清单，两者互不依赖。
 *
 * 整页没有静态内容，内容全在云端。拿不到数据时必须如实说明，绝不能拿占位文字糊弄过去。
 */
import { computed, reactive, ref, onMounted } from 'vue';
import { clone, findSpaceIndex, safeUrl } from './content/utils';
import { emptyBlock, MAX_BLOCKS_PER_SPACE } from './content/schema';
import { contentEndpoint, fetchSpaces, pushSection } from './content/api';
import BlockEditor from './components/BlockEditor.vue';

const endpoint = contentEndpoint();

const state = reactive({ items: [], index: -1, space: null, snapshot: '' });
const editing = ref(false);
const notice = ref('');
const status = reactive({ message: '', tone: '' });
const saving = ref(false);

const year = new Date().getFullYear();
const wanted = new URLSearchParams(window.location.search).get('space') || '';

const name = computed(() => String((state.space && state.space.name) || '').trim() || '未命名空间');
const blocks = computed(() => (state.space && Array.isArray(state.space.blocks) ? state.space.blocks : []));
const loaded = computed(() => Boolean(state.space));

function setStatus(message, tone) {
    status.message = message;
    status.tone = tone;
}

/** 把空间名写回标题和 og 标签，分享出去才不会永远显示「空间 · Lyq」 */
function applyMeta(title, summary) {
    document.title = `${title} · Lyq`;
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute('content', `${title} · Lyq`);

    if (!summary) return;
    const text = summary.length > 100 ? `${summary.slice(0, 100)}…` : summary;
    const descTag = document.querySelector('meta[name="description"]');
    const ogDesc = document.querySelector('meta[property="og:description"]');
    if (descTag) descTag.setAttribute('content', text);
    if (ogDesc) ogDesc.setAttribute('content', text);
}

function firstText() {
    const hit = blocks.value.find((block) => block && block.type === 'text' && String(block.value || '').trim());
    return hit ? String(hit.value).trim().replace(/\s+/g, ' ') : '';
}

function isDirty() {
    return JSON.stringify(state.space || {}) !== state.snapshot;
}

/* ---- 编辑 ---- */

function addBlock(kind) {
    if (blocks.value.length >= MAX_BLOCKS_PER_SPACE) {
        setStatus(`一个空间最多 ${MAX_BLOCKS_PER_SPACE} 块内容。`, 'error');
        return;
    }
    blocks.value.push(emptyBlock(kind));
    setStatus('加好了，记得点保存。', '');
}

function removeBlock(order) {
    blocks.value.splice(order, 1);
}

function moveBlock(order, delta) {
    const target = order + delta;
    if (target < 0 || target >= blocks.value.length) return;
    [blocks.value[order], blocks.value[target]] = [blocks.value[target], blocks.value[order]];
}

function startEditing() {
    editing.value = true;
    setStatus('', '');
}

/** 退出编辑：把空间恢复成进入编辑前的样子，没保存的改动一律丢掉 */
function stopEditing() {
    editing.value = false;
    state.items[state.index] = JSON.parse(state.snapshot);
    state.space = state.items[state.index];
}

function cancelEditing() {
    if (isDirty() && !window.confirm('有改动还没保存，确定放弃？')) return;
    stopEditing();
    setStatus('已放弃改动。', '');
}

function toggleEditing() {
    if (!state.space) return;
    if (editing.value) cancelEditing();
    else startEditing();
}

/**
 * 后端按区块存文件，spaces 是一个整体 JSON，所以保存只能整份列表写回——
 * 把改过的这一个放回原位。代价是两个人同时改不同空间会互相覆盖，
 * 目前只有管理员一个人改，先接受。
 */
async function save() {
    if (!state.space) return;
    if (!endpoint) {
        setStatus('还没配置 content-endpoint（见 site.config.js），现在改的内容不会保存。', 'error');
        return;
    }

    saving.value = true;
    const payload = state.items.map(clone);
    payload[state.index] = clone(state.space);
    const result = await pushSection(endpoint, 'spaces', { items: payload });
    saving.value = false;

    if (!result.ok) {
        if (result.errors) {
            const messages = Object.keys(result.errors).map((key) => result.errors[key]).slice(0, 3);
            setStatus(`${result.message}：${messages.join('；')}`, 'error');
        } else {
            setStatus(result.message, 'error');
        }
        return;
    }

    state.items = payload;
    state.space = payload[state.index];
    state.snapshot = JSON.stringify(state.space);
    editing.value = false;
    setStatus('已保存，访客刷新即可看到。', 'success');
}

/* ---- 启动 ---- */

onMounted(async () => {
    if (!endpoint) {
        notice.value = '这个页面还没连上云端（site.config.js 里没填 content-endpoint），读不到空间内容。';
        return;
    }
    if (!wanted) {
        notice.value = '链接里没有指定是哪个空间，回到首页选一个吧。';
        return;
    }

    const payload = await fetchSpaces(endpoint);
    if (!payload) {
        notice.value = '云端内容没取到，可能是网络问题。稍后刷新试试，或先回首页看看。';
        return;
    }

    const items = (payload.sections && payload.sections.spaces && payload.sections.spaces.items) || [];
    const index = findSpaceIndex(items, wanted);
    if (index < 0) {
        notice.value = `没找到对应的空间（${wanted}）。它可能已经被删掉或改了短名，回首页看看现在的空间列表。`;
        return;
    }

    state.items = items;
    state.index = index;
    state.space = items[index];
    state.snapshot = JSON.stringify(items[index]);
    applyMeta(name.value, firstText());
});
</script>

<template>
    <a class="skip-link" href="#main">跳到主要内容</a>

    <header id="mainHeader" class="main-header">
        <div class="container">
            <a href="index.html" class="logo">Lyq</a>
            <nav class="main-nav" aria-label="主导航">
                <ul>
                    <li><a href="index.html#hero">首页</a></li>
                    <li><a href="index.html#about">关于</a></li>
                    <li><a href="index.html#contact">联系</a></li>
                </ul>
            </nav>
        </div>
    </header>

    <main id="main">
        <section class="space-detail section" id="spaceDetail">
            <div class="container">
                <a class="back-link" href="index.html#spaces">← 返回全部空间</a>

                <template v-if="loaded">
                    <h1 v-show="!editing" class="space-detail-title">{{ name }}</h1>

                    <div v-show="!editing" class="space-detail-body">
                        <template v-if="blocks.length">
                            <template v-for="(block, order) in blocks" :key="order">
                                <p v-if="block.type === 'text' && String(block.value || '').trim()" class="space-text">
                                    {{ String(block.value).trim() }}
                                </p>
                                <figure v-else-if="block.type === 'image' && safeUrl(block.url)" class="space-media">
                                    <img :src="safeUrl(block.url)" :alt="block.alt || ''" loading="lazy" decoding="async">
                                    <figcaption v-if="String(block.alt || '').trim()">{{ String(block.alt).trim() }}</figcaption>
                                </figure>
                            </template>
                        </template>
                        <p v-else class="space-text">这个空间还没有内容。</p>
                    </div>

                    <!-- 状态条放在编辑器外面：保存成功后编辑器会收起来，提示得留得住 -->
                    <p
                        v-if="status.message"
                        class="editor-status"
                        :class="{ 'is-error': status.tone === 'error', 'is-success': status.tone === 'success' }"
                        role="status"
                        aria-live="polite"
                    >{{ status.message }}</p>

                    <div v-if="editing" class="space-editor">
                        <p class="editor-hint">只改这个空间。改完点保存，访客刷新就能看到。</p>

                        <div class="form-group">
                            <label for="editName">空间名字</label>
                            <input
                                id="editName"
                                v-model="state.space.name"
                                type="text"
                                maxlength="40"
                                autocomplete="off"
                            >
                        </div>

                        <div class="block-editor-list">
                            <BlockEditor
                                v-for="(block, order) in blocks"
                                :key="order"
                                :block="block"
                                :order="order"
                                :total="blocks.length"
                                :endpoint="endpoint"
                                @remove="removeBlock(order)"
                                @move="(delta) => moveBlock(order, delta)"
                                @notify="(payload) => setStatus(payload.message, payload.tone)"
                            />
                        </div>

                        <div class="block-actions">
                            <button type="button" class="ghost-button" @click="addBlock('text')">+ 加一段文字</button>
                            <button type="button" class="ghost-button" @click="addBlock('image')">+ 加一张图片</button>
                        </div>

                        <div class="editor-actions">
                            <button type="button" class="submit-button" :disabled="saving" @click="save">
                                {{ saving ? '保存中…' : '保存这个空间' }}
                            </button>
                            <button type="button" class="ghost-button" @click="cancelEditing">取消</button>
                        </div>
                    </div>
                </template>

                <p v-if="notice" class="space-notice">{{ notice }}</p>
            </div>
        </section>
    </main>

    <footer class="main-footer">
        <div class="container">
            <div class="footer-copyright">
                <p>&copy; {{ year }} Lyq. All rights reserved.</p>
            </div>
        </div>
    </footer>

    <!-- 内容到手了才把编辑入口放出来——不知道在改什么的时候开着编辑器只会误导 -->
    <button
        v-if="loaded"
        type="button"
        class="admin-fab"
        :class="{ 'is-active': editing }"
        @click="toggleEditing"
    >
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
            <path d="M12 20h9"></path>
            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z"></path>
        </svg>
        <span>{{ editing ? '结束编辑' : '编辑这个空间' }}</span>
    </button>
</template>
