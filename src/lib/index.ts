// place files you want to import through the `$lib` alias in this folder.

import { writable } from "svelte/store";

export const createGraph = (nodes?: App.Node<(args:any) => Record<string,any>>[], edges?: App.Edge[]): App.FilterGraph => {
  return {
    nodes: nodes ?? [],
    edges: edges ?? [],
  };
}

export const createNode = <T extends (args: any) => Record<string, any>>(
  transform: T,
  inputs: Parameters<T>[0],
  outputs: ReturnType<T>,
  pos?: [number, number]
): App.Node<T> => {
  let uuid = Math.floor(Math.random() * 10000000).toString(36);

  let node: App.Node<T> = {
    uuid,
    transform,
    inputs: writable(inputs),
    outputs: writable(outputs),
    pos: pos ?? [0, 0],
    ref: null,
  };

  node.inputs.subscribe((s) => node.outputs.set(transform(s) as ReturnType<T>));

  return node;
};

export const connect = <T extends (args: any) => Record<string, any>, K extends keyof ReturnType<T>, U extends (args: any) => Record<string, any>, V extends keyof Parameters<U>[0]>(graph: App.FilterGraph, outNode: App.Node<T>, outKey: K, inNode: App.Node<U>, inKey: V) => {
  const unsubscriber = outNode.outputs.subscribe((storeOutput) => {
    inNode.inputs.update((storeInput) => ({
      ...storeInput,
      [inKey]: storeOutput[outKey]
    }));
  });

  // if there exists an edge from nodeA/keyA -> nodeB/keyB, return
  if (
    graph.edges.find(
      ({ outVertex, inVertex }) => outVertex.node === outNode && outVertex.key === outKey && inVertex.node === inNode && inVertex.key === inKey
    )
  ) {
    return;
  }

  graph.edges = [
    ...graph.edges,
    {
      outVertex: { node: outNode, key: outKey },
      inVertex: { node: inNode, key: inKey },
      unsubscriber,
    },
  ];
};

export const  disconnect = <T extends (args: any) => Record<string, any>, K extends keyof ReturnType<T>, U extends (args: any) => Record<string, any>, V extends keyof Parameters<U>[0]>(graph: App.FilterGraph, outNode: App.Node<T>, outKey: K, inNode: App.Node<U>, inKey: V) => {
  const edge = graph.edges.find(
    ({ outVertex, inVertex }) =>
      outVertex.node === outNode &&
      outVertex.key === outKey &&
      inVertex.node === inNode &&
      inVertex.key === inKey
  );

  // if an edge exists, call the unsubscriber method and remove it from the graph.
  if (edge) {
    edge.unsubscriber();
    graph.edges = graph.edges.filter((e) => e !== edge);
  }
}
