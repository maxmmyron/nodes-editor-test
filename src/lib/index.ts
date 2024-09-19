// place files you want to import through the `$lib` alias in this folder.

import { get, writable } from "svelte/store";

export const createGraph = (nodes?: App.Node<any, {[key: string]: App.Primitive}>[], edges?: App.Edge[]): App.FilterGraph => {
  // TODO: validate edges, if there are any.

  edges = edges ?? [];

  const graph = {
    nodes: nodes ?? [],
    edges: new Array<App.Edge>(),
  };

  for (const edge of edges) {
    if(validateGraphEdge(graph, edge)) {
      graph.edges = [...graph.edges, edge];
    } else {
      throw new Error("Failed to create graph: Attempted to add edge whose vertices do not exist in graph.");
    }
  }

  return graph;
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

  let uuid = Math.floor(Math.random() * 10000000).toString(36);

  let node: App.Node<T, U> = {
    uuid,
    inputs: writable(inputs),
    outputs: writable(outputs),
    transform: (args: T): U => {
      node.inputs.set(args);
      return transform(args);
    },
    pos: pos ?? [0, 0],
    ref: null,
    __transform: transform,
    __previousInputs: inputs,
  };

  node.inputs.subscribe((s) => {
    let isTransformNecessary = false;

    for(const [key, val] of Object.entries(node.__previousInputs)) {
      if(s[key] !== val) {
        isTransformNecessary = true;
      }
    }

    if(isTransformNecessary) {
      node.outputs.set(node.__transform(s));
    }
  });

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

  const unsubscriber = outNode.outputs.subscribe((storeOutput) => {
    inNode.inputs.update((storeInput) => ({
      ...storeInput,
      [inKey]: storeOutput[outKey]
    }));
  });

  return {
    outVertex: { node: outNode, key: String(outKey) },
    inVertex: { node: inNode, key: String(inKey) },
    unsubscriber,
  };
};

export const connect = <T extends {[key: string]: App.Primitive}, U extends {[key: string]: App.Primitive}, K extends {[key: string]: App.Primitive}, Z extends {[key: string]: App.Primitive}>(graph: App.FilterGraph, outNode: App.Node<T, U>, outKey: keyof U, inNode: App.Node<K, Z>, inKey: keyof K) => {
  const edge = createEdge(outNode, outKey, inNode, inKey);

  if(!validateGraphEdge(graph, edge)) {
    throw new Error("Failed to add edge to graph: Vertices in edge do not exist on graph.");
  }

  // if there exists an edge from nodeA/keyA -> nodeB/keyB, return
  if (graph.edges.find(({ outVertex, inVertex }) => outVertex.node === outNode && outVertex.key === outKey && inVertex.node === inNode && inVertex.key === inKey)) return;

  graph.edges = [...graph.edges, edge];
};

export const disconnect = <T extends {[key: string]: App.Primitive}, U extends {[key: string]: App.Primitive}, K extends {[key: string]: App.Primitive}, Z extends {[key: string]: App.Primitive}>(graph: App.FilterGraph, outNode: App.Node<T, U>, outKey: keyof U, inNode: App.Node<K, Z>, inKey: keyof K): App.FilterGraph => {
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

  // return so reactivity works
  return graph;
}

/**
 * Validates that the edge we're trying to add to the graph is composed of two nodes that already exist on the graph
 * TODO: Should this also handle I/O checking? Ideally this is covered by type system but also worth to make sure.
 */
const validateGraphEdge = (graph: App.FilterGraph, edge: App.Edge): boolean => {
  const {outVertex, inVertex} = edge;

  if(!graph.nodes.find((v) => v.uuid === outVertex.node.uuid)) return false;
  if(!graph.nodes.find((v) => v.uuid === inVertex.node.uuid)) return false;
  return true;
};
