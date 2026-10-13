<script setup>
import { computed } from 'vue';
import { safeUrl, shortHandle } from '../content/utils';
import ContactForm from './ContactForm.vue';

const props = defineProps({
    contact: { type: Object, required: true }
});

const SUBJECT = encodeURIComponent('来自个人站点的留言');

const email = computed(() => String(props.contact.email || '').trim());
const github = computed(() => safeUrl(props.contact.github));
const githubLabel = computed(() => shortHandle(github.value));
const mailto = computed(() => (email.value ? `mailto:${email.value}?subject=${SUBJECT}` : ''));
</script>

<template>
    <section class="contact section fade-in-section" id="contact" v-fade-in>
        <div class="container">
            <h2 class="section-title">联系我</h2>

            <div class="contact-lede">
                <p class="contact-intro">{{ contact.intro }}</p>
                <ul class="contact-direct">
                    <li v-if="email">
                        <a :href="mailto" :aria-label="`发送邮件到 ${email}`">{{ email }}</a>
                    </li>
                    <li v-if="github">
                        <a
                            :href="github"
                            :aria-label="`GitHub 主页：${githubLabel}`"
                            rel="noopener noreferrer"
                            target="_blank"
                        >{{ githubLabel }}</a>
                    </li>
                </ul>
            </div>

            <ContactForm />
        </div>
    </section>
</template>
