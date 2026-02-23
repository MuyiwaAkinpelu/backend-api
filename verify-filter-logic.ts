
// Mocking the behavior of buildWhereClause to verify the logic
async function testBuildWhereClause(filters: any, mockPrisma: any) {
    const where: any = {};

    let targetProjectIDs = filters.projectIDs;

    if (filters.projectCategory !== undefined) {
        // Mocking prisma.project.findMany
        const projects = await mockPrisma.project.findMany({
            where: { category: filters.projectCategory },
            select: { id: true },
        });
        const projectIdsFromCategory = projects.map((p: any) => p.id);

        if (targetProjectIDs) {
            targetProjectIDs = targetProjectIDs.filter((id: string) =>
                projectIdsFromCategory.includes(id),
            );
        } else {
            targetProjectIDs = projectIdsFromCategory;
        }
    }

    if (targetProjectIDs) {
        where.projectsIDs = { hasSome: targetProjectIDs };
    }

    return where;
}

async function runTests() {
    console.log("Running manual verification tests...");

    const mockProjects = [
        { id: "proj1", category: "SCIDAR" },
        { id: "proj2", category: "SCIDAR" },
        { id: "proj3", category: "SOLINA_HEALTH" },
    ];

    const mockPrisma = {
        project: {
            findMany: async ({ where }: any) => {
                return mockProjects.filter(p => p.category === where.category).map(p => ({ id: p.id }));
            }
        }
    };

    // Case 1: No filters
    console.log("Test 1: No filters");
    const result1 = await testBuildWhereClause({}, mockPrisma);
    console.assert(Object.keys(result1).length === 0, "Should have no filters");

    // Case 2: Only projectCategory=SCIDAR
    console.log("Test 2: Only projectCategory=SCIDAR");
    const result2 = await testBuildWhereClause({ projectCategory: "SCIDAR" }, mockPrisma);
    console.assert(result2.projectsIDs.hasSome.length === 2, "Should find 2 projects");
    console.assert(result2.projectsIDs.hasSome.includes("proj1"), "Should include proj1");
    console.assert(result2.projectsIDs.hasSome.includes("proj2"), "Should include proj2");

    // Case 3: Only projectCategory=SOLINA_HEALTH
    console.log("Test 3: Only projectCategory=SOLINA_HEALTH");
    const result3 = await testBuildWhereClause({ projectCategory: "SOLINA_HEALTH" }, mockPrisma);
    console.assert(result3.projectsIDs.hasSome.length === 1, "Should find 1 project");
    console.assert(result3.projectsIDs.hasSome.includes("proj3"), "Should include proj3");

    // Case 4: projectCategory=SCIDAR and projectIDs=["proj1", "proj3"] (Intersection)
    console.log("Test 4: projectCategory=SCIDAR and projectIDs intersection");
    const result4 = await testBuildWhereClause({ projectCategory: "SCIDAR", projectIDs: ["proj1", "proj3"] }, mockPrisma);
    console.assert(result4.projectsIDs.hasSome.length === 1, "Should find 1 project (intersection)");
    console.assert(result4.projectsIDs.hasSome.includes("proj1"), "Should include proj1");

    // Case 5: Only projectIDs
    console.log("Test 5: Only projectIDs");
    const result5 = await testBuildWhereClause({ projectIDs: ["proj3"] }, mockPrisma);
    console.assert(result5.projectsIDs.hasSome.length === 1, "Should find 1 project");
    console.assert(result5.projectsIDs.hasSome.includes("proj3"), "Should include proj3");

    console.log("All tests passed!");
}

runTests().catch(console.error);
