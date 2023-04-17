import Controller, { inject as controller } from '@ember/controller';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { timeout } from 'ember-concurrency';
import { task } from 'ember-concurrency-decorators';

export default class ManagementFuelReportsIndexController extends Controller {
    /**
     * Inject the `operations.zones.index` controller
     *
     * @var {Controller}
     */
    @controller('operations.zones.index') zones;

    /**
     * Inject the `notifications` service
     *
     * @var {Service}
     */
    @service notifications;

    /**
     * Inject the `modals-manager` service
     *
     * @var {Service}
     */
    @service modalsManager;

    /**
     * Inject the `crud` service
     *
     * @var {Service}
     */
    @service crud;

    /**
     * Queryable parameters for this controller's model
     *
     * @var {Array}
     */
    queryParams = ['page', 'limit', 'sort', 'query', 'public_id', 'internal_id', 'created_by', 'updated_by', 'status'];

    /**
     * The current page of data being viewed
     *
     * @var {Integer}
     */
    @tracked page = 1;

    /**
     * The maximum number of items to show per page
     *
     * @var {Integer}
     */
    @tracked limit;

    /**
     * The param to sort the data on, the param with prepended `-` is descending
     *
     * @var {String}
     */
    @tracked sort;

    /**
     * The filterable param `public_id`
     *
     * @var {String}
     */
    @tracked public_id;

    /**
     * The filterable param `internal_id`
     *
     * @var {String}
     */
    @tracked internal_id;

    /**
     * The filterable param `status`
     *
     * @var {Array}
     */
    @tracked status;

    @tracked allToggled = false;

    /**
     * All columns applicable for orders
     *
     * @var {Array}
     */
    @tracked columns = [
        {
            label: 'Name',
            valuePath: 'name',
            width: '200px',
            cellComponent: 'table/cell/anchor',
            action: this.viewFuelReport,
            resizable: true,
            sortable: true,
            filterable: true,
            filterComponent: 'filter/string',
        },
        {
            label: 'ID',
            valuePath: 'public_id',
            width: '120px',
            cellComponent: 'table/cell/anchor',
            action: this.viewFuelReport,
            resizable: true,
            sortable: true,
            filterable: true,
            filterComponent: 'filter/string',
        },
        {
            label: 'Internal ID',
            valuePath: 'internal_id',
            cellComponent: 'table/cell/anchor',
            action: this.viewFuelReport,
            width: '120px',
            resizable: true,
            sortable: true,
            filterable: true,
            filterComponent: 'filter/string',
        },
        {
            label: 'Email',
            valuePath: 'email',
            cellComponent: 'table/cell/base',
            width: '80px',
            resizable: true,
            sortable: true,
            hidden: true,
            filterable: true,
            filterComponent: 'filter/string',
        },
        {
            label: 'Phone',
            valuePath: 'phone',
            cellComponent: 'table/cell/base',
            width: '80px',
            resizable: true,
            sortable: true,
            hidden: true,
            filterable: true,
            filterComponent: 'filter/string',
        },
        {
            label: 'Country',
            valuePath: 'country',
            cellComponent: 'table/cell/base',
            width: '80px',
            resizable: true,
            sortable: true,
            hidden: true,
            filterable: true,
            filterComponent: 'filter/string',
        },
        {
            label: 'Address',
            valuePath: 'place.address',
            cellComponent: 'table/cell/base',
            width: '80px',
            resizable: true,
            sortable: true,
            hidden: true,
            filterable: true,
            filterParam: 'address',
            filterComponent: 'filter/string',
        },
        {
            label: 'Status',
            valuePath: 'status',
            cellComponent: 'table/cell/status',
            width: '10%',
            resizable: true,
            sortable: true,
            filterable: true,
            filterComponent: 'filter/multi-option',
            filterOptions: this.statusOptions,
        },
        {
            label: 'Created At',
            valuePath: 'createdAt',
            sortParam: 'created_at',
            width: '10%',
            resizable: true,
            sortable: true,
            filterable: true,
            filterComponent: 'filter/date',
        },
        {
            label: 'Updated At',
            valuePath: 'updatedAt',
            sortParam: 'updated_at',
            width: '10%',
            resizable: true,
            sortable: true,
            hidden: true,
            filterable: true,
            filterComponent: 'filter/date',
        },
        {
            label: '',
            cellComponent: 'table/cell/dropdown',
            ddButtonText: false,
            ddButtonIcon: 'ellipsis-h',
            ddButtonIconPrefix: 'fas',
            ddMenuLabel: 'Fuel Report Actions',
            cellClassNames: 'overflow-visible',
            width: '150px',
            actions: [
                {
                    label: 'View Details',
                    fn: this.viewFuelReport,
                },
                {
                    label: 'Edit Fuel Report',
                    fn: this.editFuelReport,
                },
                {
                    separator: true,
                },
                {
                    label: 'Delete Fuel Report',
                    fn: this.deleteFuelReport,
                },
            ],
            sortable: false,
            filterable: false,
            resizable: false,
            searchable: false,
        },
    ];

    /**
     * Bulk deletes selected `driver` via confirm prompt
     *
     * @param {Array} selected an array of selected models
     * @void
     */
    @action bulkDeleteFuelReports() {
        const selected = this.table.selectedRows.map(({ content }) => content);

        this.crud.bulkFuelReports(selected, {
            modelNamePath: `name`,
            acceptButtonText: 'Delete Fuel Reports',
            onConfirm: (deletedFuelReports) => {
                this.allToggled = false;

                deletedFuelReports.forEach((place) => {
                    this.table.removeRow(place);
                });

                this.target?.targetState?.router?.refresh();
            },
        });
    }

    /**
     * The search task.
     *
     * @void
     */
    @task({ restartable: true }) *search({ target: { value } }) {
        // if no query don't search
        if (isBlank(value)) {
            this.query = null;
            return;
        }

        // timeout for typing
        yield timeout(250);

        // reset page for results
        if (this.page > 1) {
            this.page = 1;
        }

        // update the query param
        this.query = value;
    }

    /**
     * Toggles dialog to export `fuel-report`
     *
     * @void
     */
    @action exportFuelReports() {
        this.crud.export('fuel-report');
    }

    /**
     * View a `fuelReport` details in modal
     *
     * @param {FuelReportModel} fuelReport
     * @param {Object} options
     * @void
     */
    @action viewFuelReport(fuelReport, options) {
        this.modalsManager.show('modals/fuel-report-details', {
            title: fuelReport.name,
            fuelReport,
            ...options,
        });
    }

    /**
     * Create a new `fuelReport` in modal
     *
     * @void
     */
    @action createFuelReport() {
        const fuelReport = this.store.createRecord('fuel-report');

        return this.editFuelReport(fuelReport, {
            title: 'New Fuel Report',
            acceptButtonText: 'Confirm & Create',
            acceptButtonIcon: 'check',
            acceptButtonIconPrefix: 'fas',
            successNotification: (fuelReport) => `New fuel report (${fuelReport.name}) created.`,
            onConfirm: () => {
                if (fuelReport.get('isNew')) {
                    return;
                }

                this.table.addRow(fuelReport);
            },
        });
    }

    /**
     * Edit a `fuelReport` details
     *
     * @param {FuelReportModel} fuelReport
     * @param {Object} options
     * @void
     */
    @action editFuelReport(fuelReport, options = {}) {
        this.modalsManager.show('modals/fuel-report-form', {
            title: 'Edit FuelReport',
            acceptButtonIcon: 'save',
            fuelReport,
            confirm: (modal, done) => {
                modal.startLoading();

                fuelReport
                    .save()
                    .then((fuelReport) => {
                        if (typeof options.successNotification === 'function') {
                            this.notifications.success(options.successNotification(fuelReport));
                        } else {
                            this.notifications.success(options.successNotification || `${fuelReport.name} details updated.`);
                        }
                        return done();
                    })
                    .catch((error) => {
                        this.notifications.serverError(error);
                        modal.stopLoading();
                    });
            },
            ...options,
        });
    }

    /**
     * Delete a `fuelReport` via confirm prompt
     *
     * @param {FuelReportModel} fuelReport
     * @param {Object} options
     * @void
     */
    @action deleteFuelReport(fuelReport, options = {}) {
        this.crud.delete(fuelReport, {
            onConfirm: (fuelReport) => {
                this.table.removeRow(fuelReport);
            },
            ...options,
        });
    }
}
