import { writable } from 'svelte/store';
import type { ToastType } from '$lib/components/Toast.svelte';

// Type for a toast notification
export interface Toast {
	id: string;
	type: ToastType;
	message: string;
	duration?: number;
	showClose?: boolean;
}

// Create a writable store with an array of toasts
const toasts = writable<Toast[]>([]);

// Generate a unique ID
function generateId(): string {
	return Math.random().toString(36).substring(2, 9);
}

// Add a toast to the store
function add(
	message: string,
	type: ToastType = 'info',
	duration: number = 5000,
	showClose: boolean = true
): string {
	const id = generateId();
	const toast: Toast = {
		id,
		type,
		message,
		duration,
		showClose
	};

	toasts.update((all) => [...all, toast]);
	return id;
}

// Remove a toast by ID
function remove(id: string): void {
	toasts.update((all) => all.filter((t) => t.id !== id));
}

// Convenience methods for specific toast types
function success(message: string, duration?: number): string {
	return add(message, 'success', duration);
}

function error(message: string, duration?: number): string {
	return add(message, 'error', duration);
}

function warning(message: string, duration?: number): string {
	return add(message, 'warning', duration);
}

function info(message: string, duration?: number): string {
	return add(message, 'info', duration);
}

// Clear all toasts
function clear(): void {
	toasts.set([]);
}

// Export the store and methods
export const toastStore = {
	subscribe: toasts.subscribe,
	add,
	remove,
	success,
	error,
	warning,
	info,
	clear
};
