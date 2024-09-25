// place files you want to import through the `$lib` alias in this folder.

import { get, writable } from "svelte/store";

export const createGraph = (nodes: App.Node<any, {[key: string]: App.Primitive}>[] = [], edges: App.Edge[] = []): App.FilterGraph => {
  const graph = { nodes, edges: [] };

  // if any validation fails, error occurs and we throw.
  edges.every((e) => validateGraphEdge(graph, e))

  return { nodes, edges };
}

// TODO: does removal of this node from memory also automatically release subscription?
export const createNode = <T extends {[key: string]: App.Primitive}, U extends {[key: string]: App.Primitive}>(
  inputs: T,
  outputs: U,
  transform: (args: T) => U,
  pos?: [number, number]
): App.Node<T, U> => {
  if (typeof inputs !== "object" || typeof outputs !== "object") {
    throw new TypeError("Error instantiating node: type of inputs and outputs must both be objects (cannot be primitives).")
  }

  let subscribers = {
    "inputchange": [] as Array<() => void>,
    "transform": [] as Array<() => void>,
    "outputchange": [] as Array<() => void>,
  };

  let node: App.Node<T, U> = {
    uuid: Math.floor(Math.random() * 10000000).toString(36),
    inputs: writable(inputs),
    outputs: writable(outputs),
    transform: (args: T): U => {
      // we don't need to invoke event callbacks here because we're setting inputs store, which will then run the relevant subscription callback.
      node.inputs.set(args);
      return transform(args);
    },
    pos: pos ?? [0, 0],
    ref: null,
    __transform: transform,
    __previousInputs: inputs,
    subscribe: (ev, fn) => {
      subscribers[ev] = [...subscribers[ev], fn];

      return () => {
        subscribers[ev] = subscribers[ev].filter(f => f !== fn);
      }
    },
  };

  node.inputs.subscribe((s) => {
    subscribers.inputchange.forEach(fn => fn());
    if(Object.entries(node.__previousInputs).some(([k, v]) => s[k] !== v)) {
      const outputs = node.__transform(s);
      subscribers.transform.forEach(fn => fn());

      node.outputs.set(outputs);
    }
  });

  node.outputs.subscribe((s) => {
    subscribers.outputchange.forEach(fn => fn());
  })

  return node;
};

/**
 * Lazily creates a new edge. This is NOT validated on creation, so adding an edge created by this function
 * MUST be validated by the graph onto which this edge is being added (mainly: does this edge's graph also contain the nodes this edge connects?)
 */
export const createEdge = <T extends {[key: string]: App.Primitive}, U extends {[key: string]: App.Primitive}, K extends {[key: string]: App.Primitive}, Z extends {[key: string]: App.Primitive}>(outNode: App.Node<T, U>, outKey: keyof U, inNode: App.Node<K, Z>, inKey: keyof K): App.Edge => {
  if(typeof get(outNode.outputs)[outKey] !== typeof get(inNode.inputs)[inKey]) {
    throw new TypeError(`Error creating edge: Type mismatch between output vertex ${String(outKey)} and input vertex ${String(inKey)}`);
  }

  const unsubscribe = outNode.outputs.subscribe((storeOutput) => {
    inNode.inputs.update((storeInput) => ({
      ...storeInput,
      [inKey]: storeOutput[outKey]
    }));
  });

  return {
    outVertex: { node: outNode, key: String(outKey) },
    inVertex: { node: inNode, key: String(inKey) },
    unsubscribe,
  };
};

export const connect = <T extends {[key: string]: App.Primitive}, U extends {[key: string]: App.Primitive}, K extends {[key: string]: App.Primitive}, Z extends {[key: string]: App.Primitive}>(graph: App.FilterGraph, outNode: App.Node<T, U>, outKey: keyof U, inNode: App.Node<K, Z>, inKey: keyof K) => {
  const edge = createEdge(outNode, outKey, inNode, inKey);

  validateGraphEdge(graph, edge)

  // if there exists an edge from nodeA/keyA -> nodeB/keyB, return
  if (graph.edges.find(({ outVertex, inVertex }) => outVertex.node === outNode && outVertex.key === outKey && inVertex.node === inNode && inVertex.key === inKey)) return;

  graph.edges = [...graph.edges, edge];
};

export const disconnect = <T extends {[key: string]: App.Primitive}, U extends {[key: string]: App.Primitive}, K extends {[key: string]: App.Primitive}, Z extends {[key: string]: App.Primitive}>(graph: App.FilterGraph, outNode: App.Node<T, U>, outKey: keyof U, inNode: App.Node<K, Z>, inKey: keyof K): App.FilterGraph => {
  const edge = graph.edges.find(({ outVertex, inVertex }) => outVertex.node === outNode && outVertex.key === outKey && inVertex.node === inNode && inVertex.key === inKey);

  if (edge) {
    edge.unsubscribe();
    graph.edges = graph.edges.filter((e) => e !== edge);
  }

  return graph;
}

/**
 * Validates that the edge we're trying to add to the graph is composed of two nodes that already exist on the graph
 * TODO: Should this also handle I/O checking? Ideally this is covered by type system but also worth to make sure.
 */
const validateGraphEdge = (graph: App.FilterGraph, edge: App.Edge): boolean => {
  if(!graph.nodes.find((v) => v.uuid === edge.outVertex.node.uuid)) throw new Error("Failed to validate edge for graph: output vertex does not exist in graph");
  if(!graph.nodes.find((v) => v.uuid === edge.inVertex.node.uuid)) throw new Error("Failed to validate edge for graph: input vertex does not exist in graph");
  return true;
};
