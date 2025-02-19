import {MDXRemote} from "next-mdx-remote-client/rsc";
import path from "path";
import fs from "fs";
import {components} from "@/components/MDXComponents";

export default async function Page({params}: { params: { slug: string } }) {
    const {slug} = params;
    const filePath = path.join(process.cwd(), 'content', `${slug}.mdx`);
    const fileContent = fs.readFileSync(filePath, 'utf8');


    return (
        <article>
        <MDXRemote source={fileContent} components={components}/>
    </article>
    );
}

export function generateStaticParams() {
    return [{slug: 'test-1'}, {slug: 'test-2'}]
}

export const dynamicParams = false;
