/**
 * v-fade-in：元素滚进视口时加 is-visible，配合 CSS 做淡入。
 *
 * 做成自定义指令而不是每个组件里写一遍 IntersectionObserver，
 * 是因为这个行为跟具体组件无关，只跟「这个元素要不要淡入」有关。
 * 卸载时记得断开观察者，否则组件销毁后回调还在跑。
 */
const OPTIONS = { threshold: 0.2, rootMargin: '0px 0px -100px 0px' };

export const fadeIn = {
    mounted(el) {
        if (!('IntersectionObserver' in window)) {
            el.classList.add('is-visible');
            return;
        }
        const observer = new IntersectionObserver((entries, instance) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;
                entry.target.classList.add('is-visible');
                instance.unobserve(entry.target);
            });
        }, OPTIONS);
        observer.observe(el);
        el.__fadeObserver = observer;
    },
    unmounted(el) {
        if (el.__fadeObserver) {
            el.__fadeObserver.disconnect();
            delete el.__fadeObserver;
        }
    }
};
