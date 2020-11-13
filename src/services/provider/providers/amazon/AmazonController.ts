import { timeoutQuerySelector } from "@/helpers/querySelectors";
import { Controller } from "../Controller";

export class AmazonController extends Controller {
  public videoParentDiv = timeoutQuerySelector(".cascadesContainer");
  constructor() {
    super();
  }
}
