import { ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot, Data } from '@angular/router';
import { Injectable } from '@angular/core';
import { hasNoValue, hasValue } from '../shared/empty.util';
import { map, switchMap } from 'rxjs/operators';
import { getFirstCompletedRemoteData } from '../core/shared/operators';
import { TranslateService } from '@ngx-translate/core';
import { Observable, of as observableOf } from 'rxjs';
import { BrowseDefinitionDataService } from '../core/browse/browse-definition-data.service';
import { BrowseDefinition } from '../core/shared/browse-definition.model';
import { RemoteData } from '../core/data/remote-data';
import { PAGE_NOT_FOUND_PATH } from '../app-routing-paths';

@Injectable()
/**
 * A guard taking care of the correct route.data being set for the Browse-By components
 */
export class BrowseByGuard implements CanActivate {

  constructor(
    protected translate: TranslateService,
    protected browseDefinitionService: BrowseDefinitionDataService,
    protected router: Router,
  ) {
  }

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean> {
    const title = route.data.title;
    const id = route.params.id || route.queryParams.id || route.data.id;
    let browseDefinition$: Observable<BrowseDefinition | undefined>;
    if (hasNoValue(route.data.browseDefinition) && hasValue(id)) {
      browseDefinition$ = this.browseDefinitionService.findById(id).pipe(
        getFirstCompletedRemoteData(),
        map((browseDefinitionRD: RemoteData<BrowseDefinition>) => browseDefinitionRD.payload),
      );
    } else {
      browseDefinition$ = observableOf(route.data.browseDefinition);
    }
    const scope = route.queryParams.scope ?? route.parent?.params.id;
    const value = route.queryParams.value;
    const metadataTranslated = this.translate.instant(`browse.metadata.${id}`);
    return browseDefinition$.pipe(
      switchMap((browseDefinition: BrowseDefinition | undefined) => {
        if (hasValue(browseDefinition)) {
          route.data = this.createData(title, id, browseDefinition, metadataTranslated, value, route, scope);
          return observableOf(true);
        } else {
          void this.router.navigate([PAGE_NOT_FOUND_PATH]);
          return observableOf(false);
        }
      })
    );
  }

  private createData(title: string, id: string, browseDefinition: BrowseDefinition, field: string, value: string, route: ActivatedRouteSnapshot, scope: string): Data {
    return Object.assign({}, route.data, {
      title: title,
      id: id,
      browseDefinition: browseDefinition,
      field: field,
      value: hasValue(value) ? `"${value}"` : '',
      scope: scope,
    });
  }
}
