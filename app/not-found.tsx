import Link from "next/link";
import {Frame} from "@/app/ui";
export default function NotFound(){return <Frame><section className="wrap narrow prose"><h1>Course not found</h1><p>Use the course catalog to find the latest short courses.</p><Link className="btn primary" href="/#courses">Back to courses</Link></section></Frame>}
