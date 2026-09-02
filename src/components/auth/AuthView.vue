<script setup lang="ts">
import { computed, ref, type ComputedRef, type Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { AUTH_UI_CONFIG } from '@/config/runtimeConfig'
import { exportLocalSaveJson } from '@/services/cloudSave'
import { useAuthStore } from '@/stores/auth'

import Button from 'primevue/button'
import Checkbox from 'primevue/checkbox'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Message from 'primevue/message'
import Password from 'primevue/password'
import Textarea from 'primevue/textarea'

type AuthMode = 'login' | 'register'

const props = withDefaults(defineProps<{ embedded?: boolean }>(), { embedded: false })
const emit = defineEmits<{ authenticated: [] }>()

const { t } = useI18n()
const auth = useAuthStore()
const mode: Ref<AuthMode> = ref('login')
const username: Ref<string> = ref('')
const password: Ref<string> = ref('')
const migrateLocalProgress: Ref<boolean> = ref(true)
const isSaveViewerVisible: Ref<boolean> = ref(false)
const isSaveLoading: Ref<boolean> = ref(false)
const saveJson: Ref<string> = ref('')
const saveReadFailed: Ref<boolean> = ref(false)
const isGuestDialogVisible: Ref<boolean> = ref(false)

const errorMessage: ComputedRef<string> = computed((): string =>
  auth.errorCode ? t(`auth.errors.${auth.errorCode}`) : '',
)

const setMode = (nextMode: AuthMode): void => {
  mode.value = nextMode
  auth.errorCode = null
}

const submit = async (): Promise<void> => {
  if (mode.value === 'login') {
    const success: boolean = await auth.login({ username: username.value, password: password.value })
    if (success) emit('authenticated')
    return
  }
  const success: boolean = await auth.register({
    username: username.value,
    password: password.value,
    migrateLocalProgress: migrateLocalProgress.value,
  })
  if (success) emit('authenticated')
}

// Показывает тот же снимок Dexie, который переносится в аккаунт при регистрации.
const showLocalSave = async (): Promise<void> => {
  isSaveLoading.value = true
  saveReadFailed.value = false
  try {
    saveJson.value = await exportLocalSaveJson()
    isSaveViewerVisible.value = true
  } catch {
    saveReadFailed.value = true
  } finally {
    isSaveLoading.value = false
  }
}

const returnToRegistration = (): void => {
  isGuestDialogVisible.value = false
  setMode('register')
}

const continueAsGuest = (): void => {
  isGuestDialogVisible.value = false
  auth.startGuest()
}
</script>

<template>
  <div
    class="flex items-center justify-center bg-paper text-ink"
    :class="props.embedded ? 'w-full' : 'min-h-dvh px-4 py-8'"
  >
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
            :minlength="mode === 'register' ? 12 : 8"
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

      <div v-if="!props.embedded" class="mt-4 border-t border-ink/15 pt-4">
        <Button
          class="w-full"
          icon="pi pi-play"
          :label="t('auth.guestAction')"
          outlined
          type="button"
          @click="isGuestDialogVisible = true"
        />
      </div>

      <div v-if="AUTH_UI_CONFIG.showLocalSaveJson" class="mt-3">
        <Button
          class="w-full"
          icon="pi pi-code"
          :label="t('auth.showSaveJson')"
          :loading="isSaveLoading"
          outlined
          severity="secondary"
          type="button"
          @click="showLocalSave"
        />
        <Message v-if="saveReadFailed" class="mt-3" severity="error" :closable="false">
          {{ t('auth.errors.save-read-failed') }}
        </Message>
      </div>
    </section>

    <Dialog
      v-model:visible="isGuestDialogVisible"
      modal
      :draggable="false"
      :header="t('auth.guestDialogTitle')"
      :style="{ width: 'min(30rem, calc(100vw - 2rem))' }"
    >
      <p class="text-sm leading-relaxed text-ink/70">
        {{ t('auth.guestDialogDescription') }}
      </p>

      <template #footer>
        <Button
          :label="t('auth.guestBack')"
          text
          type="button"
          @click="returnToRegistration"
        />
        <Button
          :label="t('auth.guestContinue')"
          icon="pi pi-play"
          type="button"
          @click="continueAsGuest"
        />
      </template>
    </Dialog>

    <Dialog
      v-model:visible="isSaveViewerVisible"
      modal
      :draggable="false"
      :header="t('auth.saveJsonTitle')"
      :style="{ width: 'min(48rem, calc(100vw - 2rem))' }"
    >
      <p class="mb-3 text-sm leading-relaxed text-ink/65">{{ t('auth.saveJsonDescription') }}</p>
      <Textarea
        class="h-[min(26rem,55dvh)] w-full resize-none font-mono text-xs"
        :model-value="saveJson"
        readonly
        spellcheck="false"
      />
    </Dialog>
  </div>
</template>
