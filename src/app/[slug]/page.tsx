import {EvaluateOptions, MDXRemote} from "next-mdx-remote-client/rsc";
import path from "path";
import fs from "fs";
import {components} from "@/components/MDXComponents";
import rehypePrettyCode from "rehype-pretty-code";

export function generateStaticParams() {
    return [{slug: 'test-1'}]
}

export default async function Page({params}: { params: { slug: string } }) {
    const { slug } = params;
    const filePath = path.join(process.cwd(), 'content', `${slug}.mdx`);
    const fileContent = fs.readFileSync(filePath, 'utf8');

    const options: EvaluateOptions = {
        mdxOptions: {
            rehypePlugins: [[rehypePrettyCode, {}]],
        }
    }


    return (
        <article className='mx-auto max-w-3xl px-6 py-8'>
            <div className='prose dark:prose-invert'>
                <MDXRemote source={fileContent} components={components} options={options}/>
            </div>
        </article>
    );
}

export const dynamicParams = false;
