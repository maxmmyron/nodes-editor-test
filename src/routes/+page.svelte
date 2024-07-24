<script lang="ts">
  import { writable, get } from "svelte/store";
  // represent this in a manner that allows us to programmatically build out a tree of nodes
  // 1. list containing all nodes
  // 2. graph of nodes (how to get detached nodes if we find this via traversing)?

  // how do we represent connections in a data-driven way such that we maintain nice flow while
  // being able to generate visual??

  let graph: App.FilterGraph = {
    nodes: [],
    edges: [],
  };

  const connect = <
    T extends (args: any) => Record<string, any>,
    K extends keyof ReturnType<T>,
    U extends (args: any) => Record<string, any>,
    V extends keyof Parameters<U>[0],
  >(
    nodeA: App.Node<T>,
    keyA: K,
    nodeB: App.Node<U>,
    keyB: V
  ) => {
    const unsubscriber = nodeA.outputs.subscribe((e) => {
      let out: ReturnType<T>[K] = e[keyA];
      nodeB.inputs.update((e) => ({ ...e, [keyB]: out }));
    });

    // if there exists an edge from nodeA/keyA -> nodeB/keyB, return
    if (
      graph.edges.find(
        ({ outVertex, inVertex }) =>
          outVertex.node === nodeA &&
          outVertex.key === keyA &&
          inVertex.node === nodeB &&
          inVertex.key === keyB
      )
    ) {
      return;
    }

    graph.edges = [
      ...graph.edges,
      {
        outVertex: { node: nodeA, key: keyA },
        inVertex: { node: nodeB, key: keyB },
        unsubscriber,
      },
    ];
  };

  const disconnect = <
    T extends (args: any) => Record<string, any>,
    K extends keyof ReturnType<T>,
    U extends (args: any) => Record<string, any>,
    V extends keyof Parameters<U>[0],
  >(
    nodeA: App.Node<T>,
    keyA: K,
    nodeB: App.Node<U>,
    keyB: V
  ) => {
    const edge = graph.edges.find(
      ({ outVertex, inVertex }) =>
        outVertex.node === nodeA &&
        outVertex.key === keyA &&
        inVertex.node === nodeB &&
        inVertex.key === keyB
    );

    console.log(edge);

    // if an edge exists, call the unsubscriber method and remove it from the graph.
    if (edge) {
      edge.unsubscriber();
      console.log(
        `disconnecting ${nodeA.uuid}/${keyA.toString()} from ${nodeB.uuid}/${keyB.toString()}`
      );
      graph.edges = graph.edges.filter((e) => e !== edge);
    }
  };

  let createNode = <T extends (args: any) => Record<string, any>>(
    transform: T,
    inputs: Parameters<T>[0],
    outputs: ReturnType<T>
  ): App.Node<T> => {
    let uuid = Math.floor(Math.random() * 10000000).toString(36);

    let node = {
      uuid,
      transform,
      inputs: writable(inputs),
      outputs: writable(outputs),
    };

    node.inputs.subscribe((s) => {
      const transformed = transform(s) as ReturnType<T>;
      node.outputs.set(transformed);
    });

    graph.nodes = [...graph.nodes, node];

    return node;
  };

  let a = createNode(() => ({ default: 0 }), undefined, { default: 0 });
  let b = createNode(() => ({ default: 0 }), undefined, { default: 0 });
  const sum = createNode(
    ({ a, b }: { a: number; b: number }) => ({
      sum: a + b,
    }),
    { a: 0, b: 0 },
    { sum: 0 }
  );

  connect(a, "default", sum, "a");
  connect(b, "default", sum, "b");

  let sumOut: number;
  sum.outputs.subscribe((e) => (sumOut = e.sum));
</script>

{#each graph.nodes as node}
  {@const __inputs = get(node.inputs)}
  {@const __outputs = get(node.outputs)}
  <div class="node">
    {#if __inputs}
      <aside class="inputs">
        {#each Object.entries(__inputs) as [key, value]}
          {@const connection = graph.edges.find(
            ({ inVertex }) => inVertex.node === node && inVertex.key === key
          )}
          <div class="input">
            <p>{key}</p>
            {#if connection}
              <!-- If there exists an edge that this input is a vertex of, render the disconnect button -->
              <button
                on:click={() =>
                  disconnect(
                    connection.outVertex.node,
                    connection.outVertex.key.toString(),
                    connection.inVertex.node,
                    connection.inVertex.key
                  )}
              >
                x
              </button>
            {:else}
              <!-- Otherwise, render an input slider that corresponds to the type of the input TODO: very temporary behavior! -->
              {#if typeof value === "number"}
                <input
                  type="range"
                  on:input={(e) => {
                    const newValue = e.currentTarget.valueAsNumber;
                    node.inputs.set({ ...__inputs, [key]: newValue });
                  }}
                />
              {/if}
            {/if}
          </div>
        {/each}
      </aside>
    {/if}
    <main></main>
    {#if __outputs}
      <aside class="outputs">
        {#each Object.entries(__outputs) as [key, value] (node.uuid + key)}
          {@const connection = graph.edges.find(
            ({ outVertex }) => outVertex.node === node && outVertex.key === key
          )}
          <div class="output">
            <p>{key}-{node.uuid}</p>
            {#if connection}
              <p>({connection.inVertex.key})</p>
              <!-- If there exists an edge that this output is a vertex of, render the disconnect button -->
              <button
                on:click={() =>
                  disconnect(
                    connection.outVertex.node,
                    connection.outVertex.key.toString(),
                    connection.inVertex.node,
                    connection.inVertex.key
                  )}
              >
                x
              </button>
            {/if}
            {#if !__inputs}
              <!-- If there are *no* inputs on this node, then render an input value to modify the output (since it can't be transformed by some function) TODO: very temporary behavior! -->
              <input
                type="range"
                on:input={(e) => {
                  const newValue = e.currentTarget.valueAsNumber;
                  node.outputs.set({ ...__outputs, [key]: newValue });
                }}
              />
            {/if}
          </div>
        {/each}
      </aside>
    {/if}
  </div>
{/each}

{sumOut}

<style>
  .node {
    width: 200px;
    height: 150px;
    border: 1px solid black;
    border-radius: 2px;
    display: flex;
    gap: 2px;
  }

  .node > aside {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .node > main {
    flex-grow: 1;
    background-color: blue;
  }
</style>
