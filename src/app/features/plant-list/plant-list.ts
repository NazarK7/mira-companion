import { ChangeDetectionStrategy, Component, effect, inject, OnInit, signal, viewChild } from '@angular/core';
import { Router } from '@angular/router';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { PlantService } from '../../core/services/plant.service';

@Component({
  selector: 'app-plant-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatTableModule, MatPaginatorModule, MatSortModule, MatFormFieldModule, MatInputModule, MatIconModule, MatButtonModule, MatTooltipModule],
  templateUrl: './plant-list.html',
})
export class PlantListComponent implements OnInit {
  private readonly plantService = inject(PlantService);
  private readonly router = inject(Router);

  readonly totalItems = signal(0);
  readonly pageSize = signal(25);
  readonly pageIndex = signal(0);
  readonly searchFilter = signal('');

  readonly displayedColumns = ['name', 'customer', 'location', 'stationsCount', 'actions'];
  readonly dataSource = new MatTableDataSource<any>([]);

  readonly paginator = viewChild(MatPaginator);
  readonly sort = viewChild(MatSort);

  constructor() {
    effect(() => { this.loadPlants(); });
  }

  ngOnInit(): void {}

  loadPlants(): void {
    const params = {
      skip: this.pageIndex() * this.pageSize(),
      take: this.pageSize(),
      search: this.searchFilter().trim()
    };
    this.plantService.getAll(params).subscribe(res => {
      this.dataSource.data = res.items;
      this.totalItems.set(res.total);
    });
  }

  applyFilter(event: Event): void {
    this.searchFilter.set((event.target as HTMLInputElement).value);
    this.pageIndex.set(0);
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
  }

  viewPlant(plant: any): void {
    this.router.navigate(['/customers', plant.customerSlug, 'plants', plant.id]);
  }
}