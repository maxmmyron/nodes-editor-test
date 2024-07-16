// See https://kit.svelte.dev/docs/types#app
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
			_transform: T;
			inputs: Parameters<T>[0];
			outputs: ReturnType<T>;
			transform: () => ReturnType<T>;
		};
	}
}

export {};
