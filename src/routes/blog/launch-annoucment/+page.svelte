<script lang="ts">
	import { animate } from 'motion';
	import Image from './assets/blog-1.png';

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

<main class="mx-auto mt-22 flex max-w-7xl px-4 sm:px-6 lg:px-10">
	<article class="w-full py-8 sm:pt-12">
		<div class="grid grid-cols-1 items-center gap-8 lg:grid-cols-2 lg:gap-12">
			<div class="flex flex-col gap-4 lg:gap-6">
				<div bind:this={announcementRef} class="opacity-0">
					<span
						class="bg-accent font-display relative mb-4 flex w-fit items-center gap-2 px-3 pt-2 pb-1.5 text-sm font-medium text-black sm:px-4 sm:text-base"
						style="clip-path: polygon(8% 0%, 100% 0%, 100% 76%, 91% 100%, 0% 100%, 0% 29%);"
					>
						RELEASE ANNOUNCEMENT
						<span class="text-xs opacity-75">• August 13, 2025</span>
					</span>
				</div>
				<div bind:this={titleRef} class="opacity-0">
					<h1 class="mb-3 text-3xl leading-tight font-bold sm:mb-4 sm:text-4xl lg:text-5xl">
						The Pitch is Ready
					</h1>
					<p class="mb-2 text-lg text-white/80 sm:text-xl">
						We are excited to announce the launch of our new platform!
					</p>
					<p class="text-base text-white/70 sm:text-lg">Stay tuned for more updates.</p>
				</div>
			</div>

			<div bind:this={imageRef} class="flex flex-col gap-3 opacity-0">
				<img
					src={Image}
					alt="Blog Announcement"
					class="mx-auto h-auto w-full max-w-lg rounded-lg object-cover shadow-2xl transition-transform duration-300 hover:scale-105 lg:max-w-none"
				/>
			</div>
		</div>

		<!-- Full Article Content -->
		<div class="mx-auto mt-12 max-w-4xl sm:mt-16 lg:mt-20">
			<div class="prose prose-lg prose-invert max-w-none">
				<p class="text-accent mb-6 text-lg leading-relaxed font-medium sm:mb-8 sm:text-xl">
					We're delighted to announce that the official Master League website is now live!
				</p>

				<h2 class="text-primary mb-3 text-xl font-bold sm:mb-4 sm:text-2xl">Our Journey</h2>
				<p class="mb-4 text-sm leading-relaxed sm:mb-6 sm:text-base">
					Master League started originally back in 2003, when everything was done by pen and paper
					and there was just 4 of us, and the total prize was £20 at the end of the season. Since
					then, we tried a few different social channels, including Facebook, Twitter, and more
					recently Discord.
				</p>

				<p class="mb-4 text-sm leading-relaxed sm:mb-6 sm:text-base">
					Discord was by far the best option, with channels for individual areas such as tables,
					predictions, hall of fame, etc. However, it was still a lot of work for us to do, and
					remember each week, and as players that have played in the Master League before will be
					aware, sometimes we didn't end up sending the fixtures until the Thursday or Friday,
					making it a rush for everyone involved.
				</p>

				<h2 class="text-primary mb-3 text-xl font-bold sm:mb-4 sm:text-2xl">Building the Vision</h2>
				<p class="mb-4 text-sm leading-relaxed sm:mb-6 sm:text-base">
					Thankfully, I work with a web dev genius that is Billy, and between us we came up with the
					idea of making a website for the Master League, and what I had visioned for it, and what
					Billy has produced, has been more than I could have wished for, so a massive thank you to
					Billy for the work he has put in to get this launched and technically sound.
				</p>

				<h2 class="text-primary mb-3 text-xl font-bold sm:mb-4 sm:text-2xl">What to Expect</h2>
				<p class="mb-4 text-sm leading-relaxed sm:mb-6 sm:text-base">
					We expect that there may be some early issues or bugs, if you spot anything at all, please
					drop us a message in the Discord channel, so that we can get them fixed, even if it's a
					small issue, please let us know, as we want it to work perfectly.
				</p>

				<p class="mb-4 text-sm leading-relaxed sm:mb-6 sm:text-base">
					For launch we have several things that might appear as new, such as more stats, and
					detailed table, the table will be updated in real-time, meaning if a goal goes in, in a
					match and you predicted that score, mid-match you should see where you are in table, as it
					stands. There is also a brand-new blog area, where throughout the season we will be
					posting articles related to the Master League, the season in general, and upcoming events
					or matches, keep an eye on this to stay updated!
				</p>

				<h2 class="text-primary mb-3 text-xl font-bold sm:mb-4 sm:text-2xl">Moving Forward</h2>
				<p class="mb-4 text-sm leading-relaxed sm:mb-6 sm:text-base">
					We're super excited to bring the Master League online, and to have its own dedicated
					website, as we mentioned before, we expect that there may be some bugs, but again, please
					do let us know, and if your scores aren't registering or you think something is wrong,
					just pop us a message in the Discord, or via private message.
				</p>

				<p class="mb-4 text-sm leading-relaxed sm:mb-6 sm:text-base">
					I think that covers just about everything, for the returning players, welcome back, and
					for our new players, good luck, in which I'm sure is set to be the best season yet.
				</p>

				<div class="bg-accent/10 border-accent mt-6 border-l-4 p-4 text-center sm:mt-8 sm:p-6">
					<p class="mb-4 text-lg font-bold sm:text-xl">The Pitch is Ready.</p>
					<a
						href="/auth/signup"
						style="clip-path: polygon(8% 0%, 100% 0%, 100% 76%, 91% 100%, 0% 100%, 0% 29%);"
						class="bg-accent hover:bg-accent/90 inline-flex items-center px-6 py-3 font-semibold text-black transition-all duration-200 hover:scale-105 hover:shadow-lg"
					>
						Join Master League
					</a>
				</div>
			</div>
		</div>
	</article>
</main>
