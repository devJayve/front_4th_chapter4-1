import Link from "next/link";

export default function Home() {
    return (
        <article className='p-10 '>
            <h1 className='text-xl font-bold'>Chapter 4-1. 성능 최적화</h1>
            <div className='flex flex-col gap-2'>
                <Link href='/blog/test-1' className='underline text-blue-300'>1번 게시글</Link>
                <Link href='/blog/test-2' className='underline text-blue-300'>2번 게시글</Link>
            </div>
        </article>
    );
}
