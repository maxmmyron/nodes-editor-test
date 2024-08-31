<script lang="ts">
  import { connect, createGraph, createNode, disconnect } from "$lib";
  import { get } from "svelte/store";

  let graph = createGraph();

  let initialConnectionDirection: "out" | "in" = "out";
  let initialConnection: App.Connection<
    (args: any) => Record<string, any>
  > | null = null;

  let staticA = createNode(
    () => ({ default: 0 }),
    undefined,
    { default: 0 },
    [200, 200]
  );
  let staticB = createNode(
    () => ({ default: 0 }),
    undefined,
    { default: 0 },
    [150, 350]
  );
  const sum = createNode(
    ({ a, b }: { a: number; b: number }) => ({
      sum: a + b,
    }),
    { a: 0, b: 0 },
    { sum: 0 },
    [500, 250]
  );

  graph.nodes = [staticA, staticB, sum];

  connect(graph, staticA, "default", sum, "a");
  connect(graph, staticB, "default", sum, "b");

  let sumOut: number = 0;
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
      graph,
      outVertex.node,
      outVertex.key.toString(),
      inVertex.node,
      inVertex.key
    );
  };

  const removeConnection = (connection: App.Edge) => {
    graph = disconnect(
      graph,
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

<div class="relative w-full h-full">
  {#each graph.nodes as node}
    {@const inputsStore = get(node.inputs)}
    {@const outputsStore = get(node.outputs)}
    <div
      class="absolute border border-black rounded-md flex flex-col p-1 min-w-52"
      style="top: {node.pos[1]}px; left:{node.pos[0]}px;"
    >
      <header class="border-b">
        <p class="text-center">{node.uuid}</p>
      </header>
      <main class="flex">
        {#if inputsStore}
          <aside class="flex flex-col gap-1">
            {#each Object.entries(inputsStore) as [key, value]}
              {@const connections = getConnections({ node, key })}
              <div class="flex gap-0.5">
                {#if connections.length === 0}
                  <button
                    on:click|stopPropagation={() =>
                      startConnection(node, key, "in")}
                  >
                    +
                  </button>
                {/if}
                {#if initialConnection && initialConnectionDirection === "out" && connections.length === 0}
                  <!-- If we're drawing a new edge AND we're drawing from an
              output, check if this node is a valid input to connect to -->
                  {#if initialConnection.node.uuid !== node.uuid}
                    <!-- If this input is valid, allow connection -->
                    <button
                      on:click={() =>
                        endConnection(initialConnection, { node, key })}
                    >
                      @
                    </button>
                  {/if}
                {:else if connections.length > 0}
                  <!-- If there exists an edge that this input is a vertex of,
              render the disconnect button -->
                  <button on:click={() => removeConnection(connections[0])}
                    >x</button
                  >
                {:else}
                  <!-- Otherwise, render an input slider that corresponds to the
              type of the input TODO: very temporary behavior! -->
                  {#if typeof value === "number"}
                    <input
                      type="range"
                      on:input={(e) => {
                        const val = e.currentTarget.valueAsNumber;
                        node.inputs.update((store) => ({
                          ...store,
                          [key]: val,
                        }));
                      }}
                    />
                  {/if}
                {/if}
                <p>{key}</p>
              </div>
            {/each}
          </aside>
        {/if}
        <div class="flex-grow"></div>
        {#if outputsStore}
          <aside class="flex flex-col gap-1">
            {#each Object.entries(outputsStore) as [key, value] (node.uuid + key)}
              {@const connection = graph.edges.find(
                ({ outVertex }) =>
                  outVertex.node === node && outVertex.key === key
              )}
              <div class="flex gap-0.5">
                <p>{key}</p>
                {#if !inputsStore}
                  <!-- If there are *no* inputs on this node, then render an input
              value to modify the output (since it can't be transformed by some
              function) TODO: very temporary behavior! -->
                  <input
                    type="range"
                    on:input={(e) => {
                      const val = e.currentTarget.valueAsNumber;
                      node.outputs.update((store) => ({
                        ...store,
                        [key]: val,
                      }));
                    }}
                  />
                {/if}

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
                  <button on:click={() => removeConnection(connection)}
                    >x</button
                  >
                {/if}

                <!-- New Connection button -->
                <button
                  on:click|stopPropagation={() =>
                    startConnection(node, key, "out")}
                >
                  +
                </button>
              </div>
            {/each}
          </aside>
        {/if}
      </main>
    </div>
  {/each}
</div>

{sumOut}
