<script setup lang="ts">
import { computed, ref, type ComputedRef, type Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth'

import Button from 'primevue/button'
import Checkbox from 'primevue/checkbox'
import InputText from 'primevue/inputtext'
import Message from 'primevue/message'
import Password from 'primevue/password'

type AuthMode = 'login' | 'register'

const { t } = useI18n()
const auth = useAuthStore()
const mode: Ref<AuthMode> = ref('login')
const username: Ref<string> = ref('')
const password: Ref<string> = ref('')
const migrateLocalProgress: Ref<boolean> = ref(true)

const errorMessage: ComputedRef<string> = computed((): string =>
  auth.errorCode ? t(`auth.errors.${auth.errorCode}`) : '',
)

const setMode = (nextMode: AuthMode): void => {
  mode.value = nextMode
  auth.errorCode = null
}

const submit = async (): Promise<void> => {
  if (mode.value === 'login') {
    await auth.login({ username: username.value, password: password.value })
    return
  }
  await auth.register({
    username: username.value,
    password: password.value,
    migrateLocalProgress: migrateLocalProgress.value,
  })
}
</script>

<template>
  <main class="flex min-h-dvh items-center justify-center bg-paper px-4 py-8 text-ink">
    <section
      class="w-full max-w-md border-2 border-ink bg-paper p-5 shadow-[6px_6px_0_rgb(var(--color-gold)/0.55)] sm:p-7"
      :aria-label="t('auth.title')"
    >
      <p class="text-xs font-black uppercase tracking-[0.2em] text-coral">{{ t('app.title') }}</p>
      <h1 class="mt-2 text-3xl font-black tracking-tight">{{ t('auth.title') }}</h1>
      <p class="mt-2 text-sm leading-relaxed text-ink/65">{{ t('auth.description') }}</p>

      <div class="mt-6 grid grid-cols-2 gap-2" role="tablist" :aria-label="t('auth.mode')">
        <Button
          :outlined="mode !== 'login'"
          :label="t('auth.loginTab')"
          type="button"
          @click="setMode('login')"
        />
        <Button
          :outlined="mode !== 'register'"
          :label="t('auth.registerTab')"
          type="button"
          @click="setMode('register')"
        />
      </div>

      <form class="mt-5 space-y-4" @submit.prevent="submit">
        <label class="block">
          <span class="mb-1.5 block text-sm font-bold">{{ t('auth.username') }}</span>
          <InputText
            v-model="username"
            class="w-full"
            autocomplete="username"
            minlength="3"
            maxlength="32"
            required
          />
        </label>

        <label class="block">
          <span class="mb-1.5 block text-sm font-bold">{{ t('auth.password') }}</span>
          <Password
            v-model="password"
            class="w-full"
            input-class="w-full"
            :feedback="false"
            :toggle-mask="true"
            :autocomplete="mode === 'login' ? 'current-password' : 'new-password'"
            minlength="8"
            maxlength="128"
            required
          />
        </label>

        <div v-if="mode === 'register'" class="flex items-start gap-2">
          <Checkbox v-model="migrateLocalProgress" input-id="migrate-progress" binary />
          <label class="text-sm leading-snug text-ink/70" for="migrate-progress">
            {{ t('auth.migrateProgress') }}
          </label>
        </div>

        <Message v-if="errorMessage" severity="error" :closable="false">
          {{ errorMessage }}
        </Message>

        <Button
          class="w-full"
          :label="mode === 'login' ? t('auth.loginAction') : t('auth.registerAction')"
          :loading="auth.isSubmitting"
          type="submit"
        />
      </form>
    </section>
  </main>
</template>
