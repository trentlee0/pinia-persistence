import { PiniaPluginContext, StateTree, Store, SubscriptionCallbackMutation } from 'pinia'
import { StorageLike } from './type'

export * from './type'

export class LocalStorage implements StorageLike {
  get<T>(key: string): T | null {
    const value = localStorage.getItem(key)
    return value !== null ? JSON.parse(value) : null
  }

  set(key: string, value: any): void {
    localStorage.setItem(key, JSON.stringify(value))
  }
}

export class SessionStorage implements StorageLike {
  get<T>(key: string): T | null {
    const value = sessionStorage.getItem(key)
    return value !== null ? JSON.parse(value) : null
  }

  set(key: string, value: any): void {
    sessionStorage.setItem(key, JSON.stringify(value))
  }
}

function restore(store: Store, db: StorageLike, key: string) {
  const state = db.get<StateTree>(key)
  if (state !== null) {
    store.$patch(state)
  }
}

function persist(db: StorageLike, key: string, state: StateTree) {
  db.set(key, state)
}

export function persistPiniaPlugin(context: PiniaPluginContext) {
  const { store, options } = context
  const db = options.persist?.storage ?? new LocalStorage()
  const mapFn = options.persist?.map ?? ((state: StateTree) => state)

  store.$restore = () => restore(store, db, store.$id)

  store.$persist = () => persist(db, store.$id, mapFn(store.$state))

  if (options.persist?.enable) {
    options.persist.beforeRestored?.(store)
    restore(store, db, store.$id)
    options.persist.restored?.(store)

    store.$subscribe(
      (mutation: SubscriptionCallbackMutation<StateTree>, state: StateTree) => {
        options.persist?.beforePersisted?.(store)
        persist(db, mutation.storeId, mapFn(state))
        options.persist?.persisted?.(store)
      },
      { detached: true }
    )
  }
}

export default persistPiniaPlugin
