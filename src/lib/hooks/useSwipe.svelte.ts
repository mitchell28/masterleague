/**
 * useSwipe - A Svelte 5 hook for handling swipe gestures on mobile devices
 *
 * Features:
 * - Horizontal and vertical swipe detection
 * - Configurable threshold and velocity
 * - Touch feedback through callbacks
 * - Prevents accidental swipes during scroll
 */

export type SwipeDirection = 'left' | 'right' | 'up' | 'down' | null;

export interface SwipeOptions {
	/** Minimum distance (px) to trigger a swipe. Default: 50 */
	threshold?: number;
	/** Minimum velocity (px/ms) to trigger a swipe. Default: 0.3 */
	velocityThreshold?: number;
	/** Allow vertical swipes. Default: false */
	allowVertical?: boolean;
	/** Callback when swipe starts */
	onSwipeStart?: (direction: SwipeDirection) => void;
	/** Callback during swipe with delta values */
	onSwipeMove?: (deltaX: number, deltaY: number) => void;
	/** Callback when swipe ends */
	onSwipeEnd?: (direction: SwipeDirection) => void;
	/** Callback for left swipe */
	onSwipeLeft?: () => void;
	/** Callback for right swipe */
	onSwipeRight?: () => void;
	/** Callback for up swipe */
	onSwipeUp?: () => void;
	/** Callback for down swipe */
	onSwipeDown?: () => void;
	/** Whether swipe is currently enabled. Default: true */
	enabled?: boolean;
}

interface TouchState {
	startX: number;
	startY: number;
	startTime: number;
	currentX: number;
	currentY: number;
	isSwiping: boolean;
}

export function useSwipe(options: SwipeOptions = {}) {
	const {
		threshold = 50,
		velocityThreshold = 0.3,
		allowVertical = false,
		onSwipeStart,
		onSwipeMove,
		onSwipeEnd,
		onSwipeLeft,
		onSwipeRight,
		onSwipeUp,
		onSwipeDown,
		enabled = true
	} = options;

	let touchState = $state<TouchState>({
		startX: 0,
		startY: 0,
		startTime: 0,
		currentX: 0,
		currentY: 0,
		isSwiping: false
	});

	let direction = $state<SwipeDirection>(null);
	let deltaX = $derived(touchState.currentX - touchState.startX);
	let deltaY = $derived(touchState.currentY - touchState.startY);

	function handleTouchStart(event: TouchEvent) {
		if (!enabled) return;

		const touch = event.touches[0];
		touchState = {
			startX: touch.clientX,
			startY: touch.clientY,
			startTime: Date.now(),
			currentX: touch.clientX,
			currentY: touch.clientY,
			isSwiping: false
		};
		direction = null;
	}

	function handleTouchMove(event: TouchEvent) {
		if (!enabled || !touchState.startTime) return;

		const touch = event.touches[0];
		touchState.currentX = touch.clientX;
		touchState.currentY = touch.clientY;

		const dx = touch.clientX - touchState.startX;
		const dy = touch.clientY - touchState.startY;
		const absDx = Math.abs(dx);
		const absDy = Math.abs(dy);

		// Determine if this is a horizontal or vertical swipe
		if (!touchState.isSwiping && (absDx > 10 || absDy > 10)) {
			// If horizontal movement is greater, it's a horizontal swipe
			if (absDx > absDy) {
				touchState.isSwiping = true;
				// Prevent vertical scroll when swiping horizontally
				event.preventDefault();
			} else if (allowVertical && absDy > absDx) {
				touchState.isSwiping = true;
			}
		}

		if (touchState.isSwiping) {
			// Determine direction during swipe
			if (absDx > absDy) {
				direction = dx > 0 ? 'right' : 'left';
			} else if (allowVertical) {
				direction = dy > 0 ? 'down' : 'up';
			}

			onSwipeStart?.(direction);
			onSwipeMove?.(dx, dy);
		}
	}

	function handleTouchEnd() {
		if (!enabled || !touchState.startTime) return;

		const dx = touchState.currentX - touchState.startX;
		const dy = touchState.currentY - touchState.startY;
		const absDx = Math.abs(dx);
		const absDy = Math.abs(dy);
		const duration = Date.now() - touchState.startTime;
		const velocity = Math.max(absDx, absDy) / duration;

		let finalDirection: SwipeDirection = null;

		// Check if swipe meets threshold and velocity requirements
		if (velocity >= velocityThreshold || absDx >= threshold || absDy >= threshold) {
			if (absDx > absDy && absDx >= threshold) {
				// Horizontal swipe
				if (dx > 0) {
					finalDirection = 'right';
					onSwipeRight?.();
				} else {
					finalDirection = 'left';
					onSwipeLeft?.();
				}
			} else if (allowVertical && absDy >= threshold) {
				// Vertical swipe
				if (dy > 0) {
					finalDirection = 'down';
					onSwipeDown?.();
				} else {
					finalDirection = 'up';
					onSwipeUp?.();
				}
			}
		}

		onSwipeEnd?.(finalDirection);
		direction = finalDirection;

		// Reset state
		touchState = {
			startX: 0,
			startY: 0,
			startTime: 0,
			currentX: 0,
			currentY: 0,
			isSwiping: false
		};
	}

	function handleTouchCancel() {
		touchState = {
			startX: 0,
			startY: 0,
			startTime: 0,
			currentX: 0,
			currentY: 0,
			isSwiping: false
		};
		direction = null;
	}

	// Returns event handlers to attach to an element
	const handlers = {
		ontouchstart: handleTouchStart,
		ontouchmove: handleTouchMove,
		ontouchend: handleTouchEnd,
		ontouchcancel: handleTouchCancel
	};

	return {
		/** Current swipe direction */
		get direction() {
			return direction;
		},
		/** Current horizontal delta from start */
		get deltaX() {
			return deltaX;
		},
		/** Current vertical delta from start */
		get deltaY() {
			return deltaY;
		},
		/** Whether user is currently swiping */
		get isSwiping() {
			return touchState.isSwiping;
		},
		/** Event handlers to spread onto an element */
		handlers
	};
}

/**
 * Create a swipe action for use with Svelte's use: directive
 * Usage: <div use:swipeAction={{ onSwipeLeft: () => ... }}>
 */
export function swipeAction(node: HTMLElement, options: SwipeOptions = {}) {
	let currentOptions = options;

	function handleTouchStart(event: TouchEvent) {
		if (!currentOptions.enabled) return;
		(node as any).__swipeData = {
			startX: event.touches[0].clientX,
			startY: event.touches[0].clientY,
			startTime: Date.now(),
			isSwiping: false
		};
	}

	function handleTouchMove(event: TouchEvent) {
		const data = (node as any).__swipeData;
		if (!currentOptions.enabled || !data) return;

		const touch = event.touches[0];
		const dx = touch.clientX - data.startX;
		const dy = touch.clientY - data.startY;
		const absDx = Math.abs(dx);
		const absDy = Math.abs(dy);

		if (!data.isSwiping && (absDx > 10 || absDy > 10)) {
			if (absDx > absDy) {
				data.isSwiping = true;
				event.preventDefault();
			} else if (currentOptions.allowVertical && absDy > absDx) {
				data.isSwiping = true;
			}
		}

		if (data.isSwiping) {
			data.currentX = touch.clientX;
			data.currentY = touch.clientY;
			currentOptions.onSwipeMove?.(dx, dy);
		}
	}

	function handleTouchEnd() {
		const data = (node as any).__swipeData;
		if (!currentOptions.enabled || !data) return;

		const dx = (data.currentX || data.startX) - data.startX;
		const dy = (data.currentY || data.startY) - data.startY;
		const absDx = Math.abs(dx);
		const absDy = Math.abs(dy);
		const duration = Date.now() - data.startTime;
		const velocity = Math.max(absDx, absDy) / duration;
		const threshold = currentOptions.threshold ?? 50;
		const velocityThreshold = currentOptions.velocityThreshold ?? 0.3;

		if (velocity >= velocityThreshold || absDx >= threshold || absDy >= threshold) {
			if (absDx > absDy && absDx >= threshold) {
				if (dx > 0) {
					currentOptions.onSwipeRight?.();
					currentOptions.onSwipeEnd?.('right');
				} else {
					currentOptions.onSwipeLeft?.();
					currentOptions.onSwipeEnd?.('left');
				}
			} else if (currentOptions.allowVertical && absDy >= threshold) {
				if (dy > 0) {
					currentOptions.onSwipeDown?.();
					currentOptions.onSwipeEnd?.('down');
				} else {
					currentOptions.onSwipeUp?.();
					currentOptions.onSwipeEnd?.('up');
				}
			}
		}

		(node as any).__swipeData = null;
	}

	node.addEventListener('touchstart', handleTouchStart, { passive: true });
	node.addEventListener('touchmove', handleTouchMove, { passive: false });
	node.addEventListener('touchend', handleTouchEnd, { passive: true });
	node.addEventListener('touchcancel', handleTouchEnd, { passive: true });

	return {
		update(newOptions: SwipeOptions) {
			currentOptions = { ...newOptions };
		},
		destroy() {
			node.removeEventListener('touchstart', handleTouchStart);
			node.removeEventListener('touchmove', handleTouchMove);
			node.removeEventListener('touchend', handleTouchEnd);
			node.removeEventListener('touchcancel', handleTouchEnd);
		}
	};
}
