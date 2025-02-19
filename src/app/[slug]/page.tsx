import {MDXRemote} from "next-mdx-remote-client/rsc";
import path from "path";
import fs from "fs";

export default async function Page({params}: { params: { slug: string } }) {
    const {slug} = params;
    const filePath = path.join(process.cwd(), 'content', `${slug}.mdx`);
    const fileContent = fs.readFileSync(filePath, 'utf8');


    return (
        <article>
        <MDXRemote source={fileContent}/>
    </article>
    );
}

export function generateStaticParams() {
    return [{slug: 'test-1'}, {slug: 'test-2'}]
}

export const dynamicParams = false;
