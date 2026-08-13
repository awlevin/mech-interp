import type { CourseModule } from "@/lib/types";

const mod: CourseModule = {
  id: "0.1",
  slug: "linear-algebra",
  title: "Linear Algebra as Geometry",
  part: 0,
  tagline: "Vectors as directions, matrices as maps, and why high-dimensional space makes superposition possible.",
  estMinutes: 150,
  objectives: [
      "Read a dot product as similarity and a matrix as a transformation of space",
      "Explain rank, projections, and SVD geometrically",
      "State why exponentially many almost-orthogonal directions fit in d dimensions"
  ],
  status: "stub",
  sections: [],
};

export default mod;
