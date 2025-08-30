/**
 * Performance monitoring utilities
 */

// Web Vitals tracking
export function trackWebVitals() {
	if (typeof window !== 'undefined') {
		import('web-vitals').then(({ onCLS, onFID, onFCP, onLCP, onTTFB }) => {
			onCLS(sendToAnalytics);
			onFID(sendToAnalytics);
			onFCP(sendToAnalytics);
			onLCP(sendToAnalytics);
			onTTFB(sendToAnalytics);
		});
	}
}

function sendToAnalytics(metric: any) {
	// Send to your analytics platform
	console.log('Web Vital:', metric.name, metric.value);

	// Example: Send to Google Analytics
	if (typeof gtag !== 'undefined') {
		gtag('event', metric.name, {
			value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
			event_category: 'Web Vitals',
			event_label: metric.id,
			non_interaction: true
		});
	}
}

// Performance budget monitoring
export function checkPerformanceBudget() {
	if (typeof window !== 'undefined') {
		const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
		const paint = performance.getEntriesByType('paint');

		const metrics = {
			ttfb: navigation.responseStart - navigation.requestStart,
			fcp: paint.find((p) => p.name === 'first-contentful-paint')?.startTime || 0,
			domInteractive: navigation.domInteractive - navigation.navigationStart,
			loadComplete: navigation.loadEventEnd - navigation.navigationStart
		};

		// Define performance budgets
		const budgets = {
			ttfb: 600, // 600ms
			fcp: 1800, // 1.8s
			domInteractive: 3000, // 3s
			loadComplete: 5000 // 5s
		};

		Object.entries(metrics).forEach(([metric, value]) => {
			const budget = budgets[metric as keyof typeof budgets];
			if (value > budget) {
				console.warn(
					`⚠️ Performance budget exceeded: ${metric} = ${value}ms (budget: ${budget}ms)`
				);
			} else {
				console.log(`✅ Performance budget met: ${metric} = ${value}ms`);
			}
		});
	}
}

// Bundle size monitoring
export function trackBundleSize() {
	if (typeof window !== 'undefined') {
		const resources = performance.getEntriesByType('resource');
		const jsResources = resources.filter((r) => r.name.includes('.js'));
		const cssResources = resources.filter((r) => r.name.includes('.css'));

		const totalJS = jsResources.reduce((sum, r) => sum + (r as any).transferSize, 0);
		const totalCSS = cssResources.reduce((sum, r) => sum + (r as any).transferSize, 0);

		console.log('Bundle sizes:', {
			javascript: `${(totalJS / 1024).toFixed(2)} KB`,
			css: `${(totalCSS / 1024).toFixed(2)} KB`,
			total: `${((totalJS + totalCSS) / 1024).toFixed(2)} KB`
		});
	}
}
