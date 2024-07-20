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
    graph.edges = [
      ...graph.edges,
      [
        { node: nodeA, key: keyA },
        { node: nodeB, key: keyB },
      ],
    ];
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
      console.log("transforming...");
      const transformed = transform(s) as ReturnType<T>;
      node.outputs.set(transformed);
    });

    graph.nodes = [...graph.nodes, node];

    return node;
  };

  // 1 + 2 = 3
  // value node: 1
  let v1 = createNode(() => ({ default: 0 }), undefined, { default: 0 });

  // value node: 2
  let v2 = createNode(() => ({ default: 0 }), undefined, { default: 0 });

  // sum node: 1 + 2
  const sum = createNode(
    ({ a, b }: { a: number; b: number }) => ({
      sum: a + b,
    }),
    { a: 0, b: 0 },
    { sum: 0 }
  );

  connect(v1, "default", sum, "a");
  connect(v2, "default", sum, "b");

  let v1Out = 0,
    v2Out = 0;

  v1.outputs.subscribe((e) => {
    console.log(e);
    v1Out = e.default;
  });

  v2.outputs.subscribe((e) => {
    console.log(e);
    v2Out = e.default;
  });

  $: sumOut = sum.transform({
    a: v1Out,
    b: v2Out,
  }).sum;
</script>

{#each graph.nodes as node}
  {@const __inputs = get(node.inputs)}
  {@const __outputs = get(node.outputs)}
  <div class="node">
    {#if __inputs}
      <aside class="inputs">
        {#each Object.entries(__inputs) as [key, value]}
          <div class="input">
            <p>{key}</p>
            <!-- TODO: don't show if this node has a connection into this input! -->
            {#if typeof value === "number"}
              <input
                type="range"
                on:input={(e) => {
                  const newValue = e.currentTarget.valueAsNumber;
                  node.inputs.set({ ...__inputs, [key]: newValue });
                }}
              />
            {/if}
          </div>
        {/each}
      </aside>
    {/if}
    <main></main>
    {#if __outputs}
      <aside class="outputs">
        {#each Object.entries(__outputs) as [key, value]}
          <!-- If there *are* inputs, we can just directly render
         the output el since we don't want to allow transform -->
          {#if __inputs}
            <p>{key}</p>
          {:else}
            <div class="output">
              <p>{key}</p>
              {#if typeof value === "number"}
                <input
                  type="range"
                  on:input={(e) => {
                    const newValue = e.currentTarget.valueAsNumber;
                    node.outputs.set({ ...__outputs, [key]: newValue });
                  }}
                />
              {/if}
            </div>
          {/if}
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
