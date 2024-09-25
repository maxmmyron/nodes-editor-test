// See https://kit.svelte.dev/docs/types#app

import type { Unsubscriber, Writable } from "svelte/store";

// for information about these interfaces
declare global {
	namespace App {
		type Primitive = string | number | bigint | boolean | undefined | null | symbol;

		type FilterGraph = {
			nodes: Array<App.Node<{[key: string]: Primitive}, {[key: string]: Primitive}>>;
			edges: Array<App.Edge>;
		};

		type Edge = {
			outVertex: Connection<(args: {[key: string]: Primitive}) => {[key: string]: Primitive}>;
			inVertex: Connection<(args: {[key: string]: Primitive}) => {[key: string]: Primitive}>;
			unsubscribe: Unsubscriber;
		};

		type Connection<T extends (args: {[key: string]: Primitive}) => {[key: string]: Primitive}> = {
			node: Node;
			key: keyof Parameters<T>[0];
		};

		type Node<T extends {[key: string]: Primitive}, U extends {[key: string]: Primitive}> = {
			uuid: string;
			pos: [number, number];
			/**
			 * The HTML element used to render the node itself.
			 */
			ref: HTMLElement | null;
			/**
			 * The raw transform for the node. Used internally to handle transform when inputs are changed.
			 */
			__transform: (args: T) => U;
			/**
			 * A more accessible transform function that may be used to directly trigger transform and event propagation. This shouldn't *really* be used in prod, but may be.
			 */
			transform: (args: T) => U;
			/**
			 * A store to track current inputs. Changes to this store will:
			 *  1. run __transform function
			 *  2. update outputs store
			 */
			inputs: Writable<T>;
			/**
			 * A store to track current outputs (i.e. what is returned from transform function). Changes to this store will:
			 *  1. Update any Nodes connected to output
			 */
			outputs: Writable<U>;
			/**
			 * Previous input values. This is compared against the current input store when the store is update to give a sort-of fine-grained reactivity.
			 */
			__previousInputs: T;
			/**
			 * Runs a callback for the provided event when that event is called.
			 *
			 * @param ev the event to subscribe to:
			 * - ``inputchange``: runs after the `inputs` store has been modified, and
			 *   before the transform has been called
			 * - ``transform``: runs after the transform has been processed, and before
			 *   the output store has been modified
			 * - ``outputchange``: runs after the `outputs` store has been modified, and
			 *   before any relevant connected input stores have been modified
			 * @returns An unsubscriber function that can be invoked to remove the subscriber callback.
			 */
			subscribe: (ev: "inputchange" | "transform" | "outputchange", fn: () => void) => (() => void);
		};
	}
}

export {};
