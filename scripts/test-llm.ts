import { analyzeProfileForDomains, generateExpertCuratedRepos } from "../lib/llm";

async function main() {
    const profile = {
        name: 'Linus Torvalds',
        languages: ['C', 'C++'],
        skills: ['Linux', 'Kernel'],
        techStack: ['C'],
        repos: [],
        hasOSContributions: true
    };
    console.log("Analyzing profile...");
    const domainProfile = await analyzeProfileForDomains(profile as any);
    console.log("Domain profile:");
    console.log(JSON.stringify(domainProfile, null, 2));

    console.log("Generating repos...");
    const categories = await generateExpertCuratedRepos(domainProfile);
    console.log("Categories:");
    console.log(JSON.stringify(categories, null, 2));
}

main().catch(console.error);
