<script setup>
/**
 * 站点管理面板。
 *
 * 与空间详情页那个就地编辑器是两套东西：这里管整站文案和空间清单，
 * 详情页只改当前那一个空间。两者互不依赖。
 *
 * 脏标记用「草稿 JSON 与已发布 JSON 比对」得出，而不是在每个输入事件里记账——
 * 深层的块编辑（加文字、传图、排序）都只是改 draft，一个 deep watch 就全覆盖了。
 */
import { computed, nextTick, onMounted, onBeforeUnmount, reactive, ref, watch } from 'vue';
import { SECTIONS, SECTION_KEYS, DEFAULTS, sectionByKey, emptyItem } from '../content/schema';
import { clone, findSpaceIndex } from '../content/utils';
import { endpoint, useContent, saveSection } from '../composables/useContent';
import FieldControl from './FieldControl.vue';
import ItemEditor from './ItemEditor.vue';

const content = useContent();

const open = ref(false);
const draft = ref(clone(content.sections));
const activeKey = ref(SECTIONS[0].key);
const dirty = reactive({});
const statuses = reactive({});
const saving = reactive({});
const targetIndex = ref(-1);

const panelEl = ref(null);
const fabEl = ref(null);

const hint = computed(() => (endpoint
    ? '改完点保存，内容写入云端后所有访客刷新即可看到。每个区块单独保存，互不覆盖。'
    : '还没配置 content-endpoint，面板只能看不能存：把 site.config.example.js 复制成 site.config.js 并填上云函数地址，或直接用邮件改内容。'));

function refreshDirty() {
    SECTION_KEYS.forEach((key) => {
        dirty[key] = JSON.stringify(draft.value[key]) !== JSON.stringify(content.sections[key]);
    });
}

watch(draft, refreshDirty, { deep: true });

function setStatus(key, message, tone) {
    statuses[key] = { message, tone };
}

function clearStatus(key) {
    delete statuses[key];
}

function activateTab(key) {
    activeKey.value = key;
    clearStatus(key);
}

function openPanel() {
    draft.value = clone(content.sections);
    refreshDirty();
    open.value = true;
}

function closePanel() {
    open.value = false;
}

function togglePanel() {
    if (open.value) closePanel();
    else openPanel();
}

/* ---- 列表条目的增删改序 ---- */

function itemsOf(key) {
    return draft.value[key].items;
}

function addItem(section) {
    const items = itemsOf(section.key);
    if (items.length >= section.list.maxItems) {
        setStatus(section.key, `最多 ${section.list.maxItems} 个${section.list.label}，先删一个再加。`, 'error');
        return;
    }
    items.push(emptyItem(section));
}

function removeItem(section, index) {
    const name = itemsOf(section.key)[index].name || `这个${section.list.label}`;
    if (!window.confirm(`删除「${name}」？里面的内容一起删掉。`)) return;
    itemsOf(section.key).splice(index, 1);
}

function moveItem(section, index, delta) {
    const items = itemsOf(section.key);
    const target = index + delta;
    if (target < 0 || target >= items.length) return;
    [items[index], items[target]] = [items[target], items[index]];
}

/* ---- 保存 / 恢复默认 ---- */

async function save(key) {
    const section = sectionByKey(key);
    if (!section) return;

    if (!endpoint) {
        setStatus(key, '还没配置 content-endpoint（见 site.config.js），现在改的内容不会保存。', 'error');
        return;
    }

    saving[key] = true;
    const result = await saveSection(key, draft.value[key]);
    saving[key] = false;

    if (!result.ok) {
        if (result.errors) {
            const messages = Object.keys(result.errors).map((name) => result.errors[name]).slice(0, 3);
            setStatus(key, `${result.message}：${messages.join('；')}`, 'error');
        } else {
            setStatus(key, result.message, 'error');
        }
        return;
    }

    refreshDirty();
    setStatus(key, result.message || '已保存，访客刷新即可看到。', 'success');
}

async function reset(key) {
    const section = sectionByKey(key);
    if (!window.confirm(`把「${section.label}」恢复成默认内容？这会覆盖云端已保存的版本。`)) return;
    draft.value[key] = clone(DEFAULTS[key]);
    await save(key);
}

/* ---- 从空间详情页点「编辑这个空间」过来：定位到那一条 ---- */

const pendingSpace = new URLSearchParams(window.location.search).get('space') || '';

function focusSpace(wanted) {
    const index = findSpaceIndex(draft.value.spaces.items, wanted);
    if (index < 0) return;

    activateTab('spaces');
    targetIndex.value = index;

    nextTick(() => {
        const card = panelEl.value && panelEl.value.querySelector(`[data-item="${index}"]`);
        if (!card) return;
        try {
            card.scrollIntoView({ block: 'center', behavior: 'smooth' });
        } catch {
            /* 滚动只是为了看得清，失败不影响编辑 */
        }
        const input = card.querySelector('input');
        if (input) input.focus({ preventScroll: true });
    });
}

/**
 * 直接 index.html#edit 进来时，面板往往比云端先就绪，停在默认值上。
 * 云端回来后刷新开着面板的区块——但有未保存改动的跳过，不能覆盖正在编辑的内容。
 */
watch(() => content.loaded, (loaded) => {
    if (!loaded || !open.value) return;
    SECTION_KEYS.forEach((key) => {
        if (dirty[key]) return;
        draft.value[key] = clone(content.sections[key]);
    });
    refreshDirty();
    // 面板可能在云端回来之前就开了，那时候还找不到这个空间，这里补一次
    if (pendingSpace) focusSpace(pendingSpace);
});

/* ---- 开关的键盘与外部点击 ---- */

function onKeydown(event) {
    if (event.key === 'Escape' && open.value) closePanel();
}

function onDocumentClick(event) {
    if (!open.value) return;
    if (panelEl.value && panelEl.value.contains(event.target)) return;
    if (fabEl.value && fabEl.value.contains(event.target)) return;
    closePanel();
}

onMounted(() => {
    document.addEventListener('keydown', onKeydown);
    document.addEventListener('click', onDocumentClick);
    if (window.location.hash === '#edit') openPanel();
    if (pendingSpace) focusSpace(pendingSpace);
});

onBeforeUnmount(() => {
    document.removeEventListener('keydown', onKeydown);
    document.removeEventListener('click', onDocumentClick);
});
</script>

<template>
    <button
        ref="fabEl"
        type="button"
        class="admin-fab"
        :class="{ 'is-active': open }"
        aria-label="打开站点管理面板"
        @click="togglePanel"
    >
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
            <path d="M12 20h9"></path>
            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z"></path>
        </svg>
        <span>管理</span>
    </button>

    <aside v-if="open" ref="panelEl" class="admin-panel" aria-label="站点管理面板">
        <div class="admin-panel-head">
            <h2>站点管理</h2>
            <button type="button" class="ghost-button" @click="closePanel">收起</button>
        </div>

        <p class="editor-hint">{{ hint }}</p>

        <div class="admin-tabs" role="tablist" aria-label="内容区块">
            <button
                v-for="section in SECTIONS"
                :key="section.key"
                type="button"
                role="tab"
                class="admin-tab"
                :class="{ 'is-active': activeKey === section.key, 'is-dirty': dirty[section.key] }"
                :aria-selected="String(activeKey === section.key)"
                :data-tab="section.key"
                @click="activateTab(section.key)"
            >{{ section.label }}</button>
        </div>

        <form novalidate @submit.prevent>
            <section
                v-for="section in SECTIONS"
                :key="section.key"
                v-show="activeKey === section.key"
                class="admin-pane"
                role="tabpanel"
                :data-pane="section.key"
            >
                <div class="admin-pane-body">
                    <template v-if="section.list">
                        <div class="item-editor-list" data-item-list>
                            <ItemEditor
                                v-for="(item, index) in draft[section.key].items"
                                :key="index"
                                :section="section"
                                :item="item"
                                :index="index"
                                :total="draft[section.key].items.length"
                                :endpoint="endpoint"
                                :class="{ 'is-target': section.key === 'spaces' && index === targetIndex }"
                                @remove="removeItem(section, index)"
                                @move="(delta) => moveItem(section, index, delta)"
                                @notify="(payload) => setStatus(section.key, payload.message, payload.tone)"
                            />
                        </div>
                        <button type="button" class="ghost-button item-add" @click="addItem(section)">
                            + 添加{{ section.list.label }}
                        </button>
                    </template>

                    <template v-else>
                        <FieldControl
                            v-for="field in section.fields"
                            :key="field.name"
                            v-model="draft[section.key][field.name]"
                            :field="field"
                        />
                    </template>
                </div>

                <div class="editor-actions">
                    <button
                        type="button"
                        class="submit-button"
                        :disabled="saving[section.key]"
                        @click="save(section.key)"
                    >{{ saving[section.key] ? '保存中…' : `保存「${section.label}」` }}</button>
                    <button type="button" class="ghost-button" @click="reset(section.key)">恢复默认</button>
                </div>

                <p
                    v-if="statuses[section.key]"
                    class="editor-status"
                    :class="{
                        'is-error': statuses[section.key].tone === 'error',
                        'is-success': statuses[section.key].tone === 'success'
                    }"
                    :data-status="section.key"
                    role="status"
                    aria-live="polite"
                >{{ statuses[section.key].message }}</p>
            </section>
        </form>
    </aside>
</template>
