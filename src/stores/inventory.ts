import { computed, ref, type ComputedRef, type Ref } from 'vue'
import { defineStore } from 'pinia'
import { database, type InventoryItem, type InventoryItemType } from '@/db/database'
import { createId } from '@/utils/createId'

export const useInventoryStore = defineStore('inventory', () => {
  const items: Ref<InventoryItem[]> = ref([])
  const isLoaded: Ref<boolean> = ref(false)

  // Считает количество паков, оставляя место для будущих типов предметов.
  const packCount: ComputedRef<number> = computed(
    (): number => items.value.filter(({ type }: InventoryItem): boolean => type === 'pack').length,
  )

  // Загружает содержимое инвентаря из локальной базы данных.
  const load = async (): Promise<void> => {
    items.value = await database.inventory.orderBy('createdAt').toArray()
    isLoaded.value = true
  }

  // Создаёт предмет заданного типа и сохраняет его в инвентаре.
  const addItem = async (type: InventoryItemType): Promise<InventoryItem> => {
    const item: InventoryItem = { id: createId(), type, createdAt: Date.now() }
    await database.inventory.add(item)
    items.value = [...items.value, item]
    return item
  }

  // Создаёт новый пак через общий механизм предметов.
  const addPack = (): Promise<InventoryItem> => addItem('pack')

  // Добавляет в Pinia предмет, уже сохранённый внешней транзакцией.
  const applyPersistedItem = (item: InventoryItem): void => {
    if (items.value.some(({ id }: InventoryItem): boolean => id === item.id)) return
    items.value = [...items.value, item].sort(
      (left: InventoryItem, right: InventoryItem): number => left.createdAt - right.createdAt,
    )
    isLoaded.value = true
  }

  void load()

  return { items, isLoaded, packCount, load, addPack, applyPersistedItem }
})
