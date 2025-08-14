<script lang="ts">
	import { animate } from 'motion';
	import Image from './assets/how-to-sign-up.png';

	let announcementRef = $state<HTMLElement>();
	let titleRef = $state<HTMLElement>();
	let imageRef = $state<HTMLElement>();

	// Effect for animations
	$effect(() => {
		// Animate elements on load
		if (announcementRef) {
			animate(
				announcementRef,
				{ opacity: [0, 1], y: [-20, 0], scale: [0.95, 1] },
				{ duration: 0.8, ease: 'easeOut' }
			);
		}

		if (titleRef) {
			animate(
				titleRef,
				{ opacity: [0, 1], y: [30, 0] },
				{ duration: 0.8, delay: 0.2, ease: 'easeOut' }
			);
		}

		if (imageRef) {
			animate(
				imageRef,
				{ opacity: [0, 1], x: [30, 0], scale: [0.9, 1] },
				{ duration: 1, delay: 0.4, ease: 'easeOut' }
			);
		}
	});
</script>

<main class="mx-auto mt-16 flex max-w-7xl px-4 sm:mt-22 sm:px-6 lg:px-10">
	<article class="w-full pt-8 sm:pt-12">
		<div class="grid grid-cols-1 items-center gap-8 lg:grid-cols-2 lg:gap-12">
			<div class="flex flex-col gap-4 lg:gap-6">
				<div bind:this={announcementRef} class="opacity-0">
					<span
						class="bg-accent font-display relative mb-4 flex w-fit items-center gap-2 px-3 pt-2 pb-1.5 text-sm font-medium text-black sm:px-4 sm:text-base"
						style="clip-path: polygon(8% 0%, 100% 0%, 100% 76%, 91% 100%, 0% 100%, 0% 29%);"
					>
						HOW-TO GUIDE
						<span class="text-xs opacity-75">• August 13, 2025</span>
					</span>
				</div>
				<div bind:this={titleRef} class="opacity-0">
					<h1 class="mb-3 text-3xl leading-tight font-bold sm:mb-4 sm:text-4xl lg:text-5xl">
						How to Sign Up to Master League
					</h1>
					<p class="mb-2 text-lg text-white/80 sm:text-xl">
						A simple step-by-step guide to get you started!
					</p>
					<p class="text-base text-white/70 sm:text-lg">
						Follow these easy steps to join the competition.
					</p>
				</div>
			</div>

			<div bind:this={imageRef} class="flex flex-col gap-3 opacity-0">
				<img
					src={Image}
					alt="How to Sign Up Guide"
					class="mx-auto h-auto w-full max-w-lg rounded-lg object-cover shadow-2xl transition-transform duration-300 hover:scale-105 lg:max-w-none"
				/>
			</div>
		</div>

		<!-- Full Article Content -->
		<div class="mx-auto mt-12 max-w-4xl sm:mt-16 lg:mt-20">
			<div class="prose prose-lg prose-invert max-w-none">
				<h2 class="text-primary mb-3 text-xl font-bold sm:mb-4 sm:text-2xl">Before You Start</h2>
				<p class="mb-4 text-sm leading-relaxed sm:mb-6 sm:text-base">
					First of all, before signing up you must have paid your entry of £30 to the leader of the
					group or have spoken to them to let them know when you will pay.
				</p>

				<h2 class="text-primary mb-3 text-xl font-bold sm:mb-4 sm:text-2xl">The Sign-Up Process</h2>
				<p class="mb-4 text-sm leading-relaxed sm:mb-6 sm:text-base">
					Secondly, all you have to do is simply open the menu and click sign-up. When you do, you
					will be greeted with a screen that requires a few details, including your first name, last
					name, email address, and password. Make sure you remember these details, so that you can
					login each week – if you do forget, there will be an option to reset password.
				</p>

				<p class="mb-4 text-sm leading-relaxed sm:mb-6 sm:text-base">
					Once you've signed up, you will likely need to verify your account via your email address
					you signed up with, once you do that, you will be officially signed up to the Master
					League.
				</p>

				<h2 class="text-primary mb-3 text-xl font-bold sm:mb-4 sm:text-2xl">Quick Steps Summary</h2>
				<p class="mb-4 text-sm leading-relaxed sm:mb-6 sm:text-base">
					Sign-up is super easy and requires the following steps:
				</p>

				<div class="mb-6 rounded-lg bg-white/5 p-4 sm:p-6">
					<ul class="space-y-3 text-sm sm:text-base">
						<li class="flex items-center gap-3">
							<span
								class="bg-accent flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-black"
								>1</span
							>
							Open the menu and go to sign-up
						</li>
						<li class="flex items-center gap-3">
							<span
								class="bg-accent flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-black"
								>2</span
							>
							Enter your details
						</li>
						<li class="flex items-center gap-3">
							<span
								class="bg-accent flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-black"
								>3</span
							>
							Verify email address
						</li>
						<li class="flex items-center gap-3">
							<span
								class="bg-accent flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-black"
								>4</span
							>
							All done!
						</li>
					</ul>
				</div>

				<h2 class="text-primary mb-3 text-xl font-bold sm:mb-4 sm:text-2xl">Need Help?</h2>
				<p class="mb-4 text-sm leading-relaxed sm:mb-6 sm:text-base">
					If you come across any problems, just give us a shout, and we will guide you through it,
					or look at sorting the issue as soon as possible.
				</p>

				<div
					class="bg-accent/10 border-accent mt-6 rounded-lg border-l-4 p-4 text-center sm:mt-8 sm:p-6"
				>
					<p class="mb-4 text-lg font-bold sm:text-xl">Ready to Join?</p>
					<a
						href="/auth/signup"
						class="bg-accent hover:bg-accent/90 inline-flex items-center rounded-lg px-6 py-3 font-semibold text-black transition-all duration-200 hover:scale-105 hover:shadow-lg"
					>
						Sign Up Now
					</a>
					<p class="mt-3 text-sm text-white/70">Good luck!</p>
				</div>
			</div>
		</div>
	</article>
</main>
