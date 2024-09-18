// place files you want to import through the `$lib` alias in this folder.

import { get, writable } from "svelte/store";

export const createGraph = (nodes?: App.Node<(args:any) => Record<string,any>>[], edges?: App.Edge[]): App.FilterGraph => {
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
export const createNode = <T extends (args: any) => Record<string, any>>(
  transform: T,
  inputs: Parameters<T>[0],
  outputs: ReturnType<T>,
  pos?: [number, number]
): App.Node<T> => {
  let uuid = Math.floor(Math.random() * 10000000).toString(36);

  let node: App.Node<T> = {
    uuid,
    inputs: writable(inputs),
    outputs: writable(outputs),
    transform: (args: Parameters<T>[0]): ReturnType<T> => {
      node.inputs.set(args);
      return transform(args) as ReturnType<T>;
    },
    pos: pos ?? [0, 0],
    ref: null,
    __transform: transform,
    __previousInputs: inputs,
  };

  node.inputs.subscribe((s) => {
    let isTransformNecessary = false;

    switch(typeof node.__previousInputs) {
      // if the arg is an object (it almost always is), then we enumerate over the entries and compare.
      case "object":
        for(const [key, val] of Object.entries(node.__previousInputs)) {
          // TODO: only fine-grained when dealing with primitive types!
          if(s[key] !== val) {
            isTransformNecessary = true;
          }
        }
        break;
      // these cases can be easily managed with single equivalency
      case "number":
      case "string":
      case "boolean":
        if(node.__previousInputs !== get(node.inputs)) {
          isTransformNecessary = true;
        }
        break;
      // default case runs for object types whose equivalency we cannot easily manage (like function), or in the case of undefined
      default:
        isTransformNecessary = true;
        break;
    }

    if(isTransformNecessary) {
      node.outputs.set(node.__transform(s) as ReturnType<T>)
    }
  });

  return node;
};

/**
 * Lazily creates a new edge. This is NOT validated on creation, so adding an edge created by this function
 * MUST be validated by the graph onto which this edge is being added (mainly: does this edge's graph also contain the nodes this edge connects?)
 */
export const createEdge = <T extends (args: any) => Record<string, any>, K extends keyof ReturnType<T>, U extends (args: any) => Record<string, any>, V extends keyof Parameters<U>[0]>(outNode: App.Node<T>, outKey: K, inNode: App.Node<U>, inKey: V): App.Edge => {
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
    outVertex: { node: outNode, key: outKey },
    inVertex: { node: inNode, key: inKey },
    unsubscriber,
  };
};

export const connect = <T extends (args: any) => Record<string, any>, K extends keyof ReturnType<T>, U extends (args: any) => Record<string, any>, V extends keyof Parameters<U>[0]>(graph: App.FilterGraph, outNode: App.Node<T>, outKey: K, inNode: App.Node<U>, inKey: V) => {
  const edge = createEdge(outNode, outKey, inNode, inKey);

  if(!validateGraphEdge(graph, edge)) {
    throw new Error("Failed to add edge to graph: Vertices in edge do not exist on graph.");
  }

  // if there exists an edge from nodeA/keyA -> nodeB/keyB, return
  if (graph.edges.find(({ outVertex, inVertex }) => outVertex.node === outNode && outVertex.key === outKey && inVertex.node === inNode && inVertex.key === inKey)) return;

  graph.edges = [...graph.edges, edge];
};

export const disconnect = <T extends (args: any) => Record<string, any>, K extends keyof ReturnType<T>, U extends (args: any) => Record<string, any>, V extends keyof Parameters<U>[0]>(graph: App.FilterGraph, outNode: App.Node<T>, outKey: K, inNode: App.Node<U>, inKey: V): App.FilterGraph => {
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
