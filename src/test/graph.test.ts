import { test, expect, it, describe, vi } from "vitest";
import * as lib from "$lib";
import { get } from "svelte/store";

const createEmptyNode = () => lib.createNode(() => ({}), undefined, {});

describe("graph", () => {
  it("may be instantiated with with zero arguments", () => {
    const graph = lib.createGraph();

    expect(graph.edges.length).toBe(0);
    expect(graph.nodes.length).toBe(0);
  });

  it("may be instantiated with with default node args", () => {
    const graph = lib.createGraph([createEmptyNode(), createEmptyNode()]);
    expect(graph.nodes.length).toBe(2);
  });

  it("may be instantiated with with default node and edge args", () => {
    const nodeOut = lib.createNode(() => ({output: 1}), undefined, {output: 0});
    const nodeIn = lib.createNode((arg: {input: number}) => ({}), {input: 0}, {});
    const graph = lib.createGraph([nodeOut, nodeIn], [lib.createEdge(nodeOut, "output", nodeIn, "input")]);
    expect(graph.nodes.length).toBe(2);
  });

  it("fails on instantiation when edge arg contains nodes that do not exist in the graph", () => {
    const nodeOut = lib.createNode(() => ({output: 1}), undefined, {output: 0});
    const nodeIn = lib.createNode((arg: {input: number}) => ({}), {input: 0}, {});

    // errors with no common args
    expect(() => lib.createGraph([], [lib.createEdge(nodeOut, "output", nodeIn, "input")])).toThrowError();
  });
});

describe("node", () => {
  it("may be instantiated", () => {
    const node = lib.createNode(() => ({}), undefined, {}, [0, 0]);

    expect(get(node.inputs)).toBeUndefined();
    const stringifiedOutputs = JSON.stringify(get(node.outputs));
    expect(stringifiedOutputs).toBe("{}");

    const spy = vi.spyOn(node, "transform");

    node.transform();

    expect(spy).toHaveBeenCalled();
    expect(spy).toHaveReturnedWith({});
  });

  it("can run an empty transform successfully", () => {
    const node = lib.createNode(() => ({}), undefined, {}, [0, 0]);
    const spy = vi.spyOn(node, "transform");

    node.transform();

    expect(spy).toHaveBeenCalled();
  });

  it("can be instantiated with default input and outputs args", () => {
    const node = lib.createNode((arg0: {a: number, b: number}) => ({x: arg0.a + arg0.b}), {a: 2, b: 4}, {x: 6}, [0, 0]);

    expect(get(node.inputs).a).toBe(2);
    expect(get(node.inputs).b).toBe(4);
    expect(get(node.outputs).x).toBe(6);
  });

  it("can run a transform with args", () => {
    const node = lib.createNode((arg0: {a: number, b: number}) => ({x: arg0.a + arg0.b}), {a: 0, b: 0}, {x: 0}, [0, 0]);
    const spy = vi.spyOn(node, "transform");

    node.transform({a: 1, b: 2});

    expect(spy).toHaveBeenCalled();
    expect(spy).toHaveReturnedWith({x: 3});
  });
});

describe("edge", () => {
  it("may be instantiated", () => {});
});
