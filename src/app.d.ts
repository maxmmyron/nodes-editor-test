// See https://kit.svelte.dev/docs/types#app

import type { Unsubscriber, Writable } from "svelte/store";

// for information about these interfaces
declare global {
	namespace App {
		type FilterGraph = {
			nodes: Array<Node<(args: any) => Record<string, any>>>;
			edges: Array<App.Edge>;
		};

		type Edge = {
			outVertex: Connection<(args: any) => Record<string, any>>;
			inVertex: Connection<(args: any) => Record<string, any>>;
			unsubscriber: Unsubscriber;
		};

		type Connection<T extends (args: any) => Record<string, any>> = {
			node: Node<T>;
			key: keyof Parameters<T>[0];
		};

		// TODO: we should more strictly require input arg to be a Record<string, any> (or, even better, Record<string, any primitive>)
		type Node<T extends (args: any) => Record<string, any>> = {
			uuid: string;
			pos: [number, number];
			/**
			 * The HTML element used to render the node itself.
			 */
			ref: HTMLElement | null;
			/**
			 * The raw transform for the node. Used internally to handle transform when inputs are changed.
			 */
			__transform: T;
			/**
			 * A more accessible transform function that may be used to directly trigger transform and event propagation. This shouldn't *really* be used in prod, but may be.
			 * FIXME: undefined args (i.e. no inputs args on a transform) requires
			 *  "undefined" when running transform() directly. Ideally, this should
			 * be removed, such that no args can be ran as "transform()", not
			 * "transform(undefined)"
			 */
			transform: (args: Parameters<T>[0]) => ReturnType<T>;
			/**
			 * A store to track current inputs. Changes to this store will:
			 *  1. run __transform function
			 *  2. update outputs store
			 */
			inputs: Writable<Parameters<T>[0]>;
			/**
			 * TODO: Does this follow fine reactivity? Ideally, change to outputs
			 * (like where x is changes and y isn't) should *only* trigger change
			 * to those nodes attached to outputs[x] and not outputs[y].
			 *
			 * A store to track current outputs (i.e. what is returned from transform function). Changes to this store will:
			 *  1. Update any Nodes connected to output
			 */
			outputs: Writable<ReturnType<T>>;
			/**
			 * Previous input values. This is compared against the current input store when the store is update to give a sort-of fine-grained reactivity.
			 */
			__previousInputs: Parameters<T>[0];
		};
	}
}

export {};
