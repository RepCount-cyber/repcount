import type {Metadata} from "next";
import Register from "../Register";

export const metadata: Metadata = {title: "Create your account — RepCount"};

export default function RegisterPage() {
  return <Register/>;
}
