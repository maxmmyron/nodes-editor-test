// See https://kit.svelte.dev/docs/types#app

import type { Writable } from "svelte/store";

// for information about these interfaces
declare global {
	namespace App {
		type FilterGraph = {
			nodes: Array<Node<(args: any) => Record<string, any>>>;
			edges: Array<
				[
					Connection<(args: any) => Record<string, any>>,
					Connection<(args: any) => Record<string, any>>,
				]
			>;
		};

		type Connection<T extends (args: any) => Record<string, any>> = {
			node: Node<T>;
			key: keyof Parameters<T>[0];
		};

		type Node<T extends (args: any) => Record<string, any>> = {
			uuid: string;
			transform: T;
			inputs: Writable<Parameters<T>[0]>;
			outputs: Writable<ReturnType<T>>;
		};
	}
}

export {};
