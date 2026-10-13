<script setup>
/**
 * 联系表单：前端即时校验 + 提交到云函数。
 *
 * 三种结果都要让用户看得见：成功、服务端拒绝、网络失败。
 * 没配 contact 端点时如实说「在线留言还没开通」并引导邮件联系——
 * 绝不能把没发出去的留言显示成「发送成功」。
 */
import { reactive, ref } from 'vue';
import { contactEndpoint, sendMessage } from '../content/api';

const FALLBACK_CONTACT = '你可以直接发邮件到 18546266901@163.com。';

const VALIDATORS = {
    name(value) {
        const trimmed = value.trim();
        if (!trimmed) return '请填写您的姓名';
        if (trimmed.length < 2) return '姓名至少 2 个字符';
        return '';
    },
    email(value) {
        const trimmed = value.trim();
        if (!trimmed) return '请填写您的邮箱';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(trimmed)) return '邮箱格式看起来不太对';
        return '';
    },
    message(value) {
        const trimmed = value.trim();
        if (!trimmed) return '留言内容不能为空';
        if (trimmed.length < 10) return '再多写几句吧，至少 10 个字符';
        return '';
    }
};

const form = reactive({ name: '', email: '', message: '' });
const errors = reactive({ name: '', email: '', message: '' });
const status = reactive({ message: '', tone: '', visible: false });
const sending = ref(false);

function validateField(name) {
    errors[name] = VALIDATORS[name](form[name]);
    return !errors[name];
}

function onBlur(name) {
    validateField(name);
}

function onInput(name) {
    // 已经标红过的字段才实时重校验，避免刚开始打字就报错
    if (errors[name]) validateField(name);
}

function showStatus(message, tone) {
    status.message = message;
    status.tone = tone;
    status.visible = true;
}

async function onSubmit() {
    const firstInvalid = ['name', 'email', 'message'].find((name) => !validateField(name));
    if (firstInvalid) {
        status.visible = false;
        return;
    }

    const endpoint = contactEndpoint();
    if (!endpoint) {
        showStatus(`在线留言还没开通，${FALLBACK_CONTACT}`, 'error');
        return;
    }

    sending.value = true;
    status.visible = false;

    const result = await sendMessage(endpoint, {
        name: form.name.trim(),
        email: form.email.trim(),
        message: form.message.trim()
    });
    sending.value = false;

    if (result.ok) {
        form.name = '';
        form.email = '';
        form.message = '';
        ['name', 'email', 'message'].forEach((name) => { errors[name] = ''; });
        showStatus(result.message, 'success');
        return;
    }

    if (result.errors) {
        // 服务端给出的是字段级错误，回填到对应输入框而不是笼统报错
        ['name', 'email', 'message'].forEach((name) => {
            if (result.errors[name]) errors[name] = result.errors[name];
        });
        showStatus(result.message || '有几项内容需要修改一下。', 'error');
        return;
    }

    showStatus(`${result.message} ${FALLBACK_CONTACT}`, 'error');
}
</script>

<template>
    <form class="contact-form" novalidate @submit.prevent="onSubmit">
        <p
            class="form-status"
            role="status"
            aria-live="polite"
            :class="{ 'is-error': status.tone === 'error', 'is-success': status.tone === 'success' }"
            :hidden="!status.visible"
        >{{ status.message }}</p>

        <div class="form-group">
            <label class="visually-hidden" for="contactName">您的姓名</label>
            <input
                id="contactName"
                v-model="form.name"
                type="text"
                name="name"
                placeholder="您的姓名"
                autocomplete="name"
                :aria-invalid="errors.name ? 'true' : null"
                aria-describedby="nameError"
                @blur="onBlur('name')"
                @input="onInput('name')"
            >
            <span class="form-error" id="nameError" :hidden="!errors.name">{{ errors.name }}</span>
        </div>

        <div class="form-group">
            <label class="visually-hidden" for="contactEmail">您的邮箱</label>
            <input
                id="contactEmail"
                v-model="form.email"
                type="email"
                name="email"
                placeholder="您的邮箱"
                autocomplete="email"
                :aria-invalid="errors.email ? 'true' : null"
                aria-describedby="emailError"
                @blur="onBlur('email')"
                @input="onInput('email')"
            >
            <span class="form-error" id="emailError" :hidden="!errors.email">{{ errors.email }}</span>
        </div>

        <div class="form-group">
            <label class="visually-hidden" for="contactMessage">您的留言</label>
            <textarea
                id="contactMessage"
                v-model="form.message"
                name="message"
                placeholder="您的留言"
                rows="5"
                :aria-invalid="errors.message ? 'true' : null"
                aria-describedby="messageError"
                @blur="onBlur('message')"
                @input="onInput('message')"
            ></textarea>
            <span class="form-error" id="messageError" :hidden="!errors.message">{{ errors.message }}</span>
        </div>

        <button type="submit" class="submit-button" :disabled="sending">
            {{ sending ? '发送中…' : '发送留言' }}
        </button>
    </form>
</template>
