import { ref } from "vue"

export interface AppNotif {
    id: string
    type: 'success' | 'error' | 'warning' | 'info'
    message: string
    timeoutMS: number
}
export const notifsQueue = ref<AppNotif[]>([])
export const timeouts = ref<Record<string, (number |undefined)>>({})

export function prepDismissNotif(notif: AppNotif) {
    return () => {
        clear(notif)
        return notifsQueue.value = notifsQueue.value.filter(n => n.id != notif.id)
    }
}
export function dismissNotif(notif: AppNotif) {
    clear(notif)
    notifsQueue.value = notifsQueue.value.filter(n => n.id != notif.id)
}

export function clear(notif:AppNotif) {
    clearTimeout(timeouts.value[notif.id])
    timeouts.value[notif.id] = undefined
}
export function delayCloseNotif(notif: AppNotif) {
    clearTimeout(timeouts.value[notif.id])
    const t = setTimeout(prepDismissNotif(notif), notif.timeoutMS)
    timeouts.value[notif.id] = t
}
export function addNotif(notif: AppNotif) {
    // adding the same id will reset the timeout to the new value
    if (timeouts.value[notif.id] !== undefined) {
        delayCloseNotif(notif)
        return
    }
    notifsQueue.value.push(notif)
    delayCloseNotif(notif)
}

export function updateNotif(id: string, props: Partial<Exclude<AppNotif, 'id'>>) {
    const index = notifsQueue.value.findIndex(n => n.id === id);
    if (index !== -1) {
        notifsQueue.value[index] = { ...notifsQueue.value[index], ...props };
        delayCloseNotif(notifsQueue.value[index])
    }
}
