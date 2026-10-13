/**
 * 站点内容的全局 store。
 *
 * 做成模块级单例而不是每个组件各自持有，是因为内容只在启动时从云端拉一次，
 * 之后「页面渲染」和「管理面板」读的是同一份数据——面板保存成功要能立刻反映到页面上。
 * 这是 Vue 里少数适合用单例的场景：整页共享、且只有一个来源。
 */
import { reactive } from 'vue';
import { clone } from '../content/utils';
import { DEFAULTS } from '../content/schema';
import { contentEndpoint, fetchSections, pushSection } from '../content/api';

const state = reactive({
    /** 页面上正在展示的内容 */
    sections: clone(DEFAULTS),
    /** 云端内容是否已经回来 */
    loaded: false,
    /** 是否配置了 content 端点；没配就是只读 */
    writable: false
});

export const endpoint = contentEndpoint();
state.writable = Boolean(endpoint);

export function useContent() {
    return state;
}

/**
 * 启动时拉一次云端内容。
 * 失败的语义是「沿用默认内容」，不是「报错」——接口不通时页面照样完整可读。
 */
export async function loadSections() {
    if (!endpoint) return false;

    const remote = await fetchSections(endpoint);
    if (!remote) return false;

    Object.keys(remote).forEach((key) => {
        if (!(key in DEFAULTS)) return;
        // 云端返回 null 表示该区块从没保存过，保持默认内容
        if (remote[key] === null || remote[key] === undefined) return;
        state.sections[key] = remote[key];
    });

    state.loaded = true;
    return true;
}

/** 保存一个区块。成功时把结果写回 store，页面立刻跟着变 */
export async function saveSection(key, content) {
    const result = await pushSection(endpoint, key, content);
    if (result.ok) state.sections[key] = clone(content);
    return result;
}
