<script lang="ts">
  import { writable, get } from "svelte/store";

  let graph: App.FilterGraph = {
    nodes: [],
    edges: [],
  };

  let initialConnectionDirection: "out" | "in" = "out";
  let initialConnection: App.Connection<
    (args: any) => Record<string, any>
  > | null = null;

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

    initialConnection = null;
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

    // if an edge exists, call the unsubscriber method and remove it from the graph.
    if (edge) {
      edge.unsubscriber();
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

  let staticA = createNode(() => ({ default: 0 }), undefined, { default: 0 });
  let staticB = createNode(() => ({ default: 0 }), undefined, { default: 0 });
  const sum = createNode(
    ({ a, b }: { a: number; b: number }) => ({
      sum: a + b,
    }),
    { a: 0, b: 0 },
    { sum: 0 }
  );

  connect(staticA, "default", sum, "a");
  connect(staticB, "default", sum, "b");

  let sumOut: number;
  sum.outputs.subscribe((e) => (sumOut = e.sum));

  const startConnection = (
    node: App.Node<(args: any) => Record<string, any>>,
    key: string,
    dir: "in" | "out"
  ) => {
    initialConnectionDirection = dir;
    initialConnection = { node, key };
  };

  const endConnection = (
    outVertex: App.Connection<(args: any) => Record<string, any>> | null,
    inVertex: App.Connection<(args: any) => Record<string, any>> | null
  ) => {
    if (!outVertex || !inVertex) return;
    connect(
      outVertex.node,
      outVertex.key.toString(),
      inVertex.node,
      inVertex.key
    );
  };

  const removeConnection = (connection: App.Edge) => {
    disconnect(
      connection.outVertex.node,
      connection.outVertex.key.toString(),
      connection.inVertex.node,
      connection.inVertex.key
    );
  };

  const getConnections = (
    inConnection: App.Connection<(args: any) => Record<string, any>>,
    outConnection: App.Connection<
      (args: any) => Record<string, any>
    > | null = null
  ) => {
    if (!outConnection) {
      return graph.edges.filter(
        ({ inVertex }) =>
          inVertex.node === inConnection.node &&
          inVertex.key === inConnection.key
      );
    } else {
      return graph.edges.filter(
        ({ inVertex, outVertex }) =>
          inVertex.node === inConnection.node &&
          inVertex.key === inConnection.key &&
          outVertex.node === outConnection.node &&
          outVertex.key === outConnection.key
      );
    }
  };
</script>

<svelte:window
  on:click={() => {
    if (initialConnection) {
      initialConnection = null;
    }
  }}
/>

<!-- FOR EACH INPUT -->
<!--   IF there exists a new_connection AND it is from an output -->
<!--     IF the new_connection's output doesn't already have a new_connection
          to this input AND the output is not on this node -->
<!--       show "connect" button -->
<!--  OTHERWISE, IF there exists a connection -->
<!--     SHOW: "disconnect" button -->
<!--   SHOW: "start connection" button -->

<!-- FOR EACH OUTPUT -->
<!--   IF there exists a new_connection AND it is from an input -->
<!--     IF the new_connection's input doesn't already have a new_connection
          to this output AND the input is not on this node -->
<!--       SHOW: "end connection button" -->
<!--   OTHERWISE, IF there exists a connection -->
<!--     SHOW: "disconnect" button -->
<!--   SHOW: "start connection" button -->

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
            {#if initialConnection && initialConnectionDirection === "out"}
              <!-- If we're drawing a new edge AND we're drawing from an
              output, check if this node is a valid input to connect to -->
              {#if initialConnection.node.uuid !== node.uuid && getConnections( { node, key } ).length === 0}
                <!-- If this input is valid, allow connection -->
                <button
                  on:click={() =>
                    endConnection(initialConnection, { node, key })}
                >
                  @
                </button>
              {/if}
            {:else if connection}
              <!-- If there exists an edge that this input is a vertex of,
              render the disconnect button -->
              <button on:click={() => removeConnection(connection)}>x</button>
            {:else}
              <!-- Otherwise, render an input slider that corresponds to the
              type of the input TODO: very temporary behavior! -->
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
            <button
              on:click|stopPropagation={() => startConnection(node, key, "in")}
            >
              +
            </button>
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
            {#if initialConnection && initialConnectionDirection === "in"}
              <!-- If we're drawing a new edge AND we're drawing from an input,
              check if this node is a valid output to connect to -->
              {#if initialConnection.node.uuid !== node.uuid && getConnections( initialConnection, { node, key } ).length === 0}
                <!-- If this input is valid, allow connection -->
                <button
                  on:click={() =>
                    endConnection({ node, key }, initialConnection)}
                >
                  @
                </button>
              {/if}
            {:else if connection}
              <!-- If there exists an edge that this output is a vertex of,
              render the disconnect button -->
              <p>({connection.inVertex.key})</p>
              <button on:click={() => removeConnection(connection)}>x</button>
            {/if}

            {#if !__inputs}
              <!-- If there are *no* inputs on this node, then render an input
              value to modify the output (since it can't be transformed by some
              function) TODO: very temporary behavior! -->
              <input
                type="range"
                on:input={(e) => {
                  const newValue = e.currentTarget.valueAsNumber;
                  node.outputs.set({ ...__outputs, [key]: newValue });
                }}
              />
            {/if}

            <!-- New Connection button -->
            <button
              on:click|stopPropagation={() => startConnection(node, key, "out")}
            >
              +
            </button>
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
