import { computed, ref, type ComputedRef, type Ref } from 'vue'
import { defineStore } from 'pinia'
import { database, type InventoryItem, type InventoryItemType } from '@/db/database'

export const useInventoryStore = defineStore('inventory', () => {
  const items: Ref<InventoryItem[]> = ref([])
  const isLoaded: Ref<boolean> = ref(false)

  // Считает количество пакетов, оставляя место для будущих типов предметов
  const packCount: ComputedRef<number> = computed(
    (): number => items.value.filter(({ type }: InventoryItem): boolean => type === 'pack').length,
  )

  // Загружает содержимое инвентаря из локальной базы данных
  const load = async (): Promise<void> => {
    items.value = await database.inventory.orderBy('createdAt').toArray()
    isLoaded.value = true
  }

  // Создаёт предмет заданного типа и сохраняет его в инвентаре
  const addItem = async (type: InventoryItemType): Promise<InventoryItem> => {
    const item: InventoryItem = { id: crypto.randomUUID(), type, createdAt: Date.now() }
    await database.inventory.add(item)
    items.value = [...items.value, item]
    return item
  }

  // Добавляет новый Pack через общий механизм предметов
  const addPack = (): Promise<InventoryItem> => addItem('pack')

  // Удаляет один открываемый Pack из локального инвентаря
  const removePack = async (): Promise<boolean> => {
    const pack: InventoryItem | undefined = items.value.find(({ type }) => type === 'pack')
    if (!pack) return false

    await database.inventory.delete(pack.id)
    items.value = items.value.filter(({ id }) => id !== pack.id)
    return true
  }

  void load()

  return { items, isLoaded, packCount, addPack, removePack }
})
