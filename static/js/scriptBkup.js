document.addEventListener("DOMContentLoaded", function () {
    const cardContainer = document.getElementById('card-container');
    const modalElement = document.getElementById('staticBackdrop');
    const groupLinks = document.querySelectorAll('.group-link');
    const searchList = document.querySelector('.search-list');
    const envForm = document.getElementById('form');
    const branchDropdownButton = document.getElementById('filterBranch');
    const dropdownItems = document.querySelectorAll('.dropdown-menu .dropdown-item');
    const pinnedOptions = document.getElementById('pinnedOptions');
    const UIDField = document.getElementById('uuidField');
    const generateIdButton = document.getElementById('generateIdButton');
    const unpinAllButton = document.getElementById('unpinAllButton');
    const retrievePinsButton = document.getElementById('retrievePinsButton');

    let envData = {};
    let currentEnvironmentName = null;
    let selectedEnv = {};
    let dataTableInstance = null;
    let dbType = 'all';
    let filteredEnvironments = {};
    let selectedStatus = 'all';
    let environmentName = '';
    // let elasticIframe = null;

    // const elasticColor = "red";
    // const url = "http://localhost:8080/iframe";

    // generateIdButton.addEventListener('click', async function(){})

    groupLinks.forEach(link => {
        link.addEventListener('click', function () {
            groupLinks.forEach(link => link.classList.remove('active'));
            this.classList.add('active');
            dbType = this.getAttribute('data-db-type').toLowerCase();
            generateCards(envData); // Use stored data to generate cards
        });
    });

    function populateBranchDropdown() {
        const branchNames = new Set();
        Object.values(envData).forEach(env => {
            branchNames.add(env.branch_name);
        })
        const branchDropdown = document.getElementById('branchDropdown');
        branchDropdown.innerHTML = '';
        const clearFilterItem = document.createElement('li');
        clearFilterItem.innerHTML = `<a class="dropdown-item" href="#">Clear Filter</a>`;
        clearFilterItem.addEventListener('click', function () {
            selectedBranch = '';
            branchDropdownButton.innerText = 'Filter By Branch';
            filteredEnvironments = envData;
            generateCards(envData); // Reset to show all environments
        });
        branchDropdown.appendChild(clearFilterItem);
        branchNames.forEach(branchName => {
            const listItem = document.createElement('li');
            listItem.innerHTML = `<a class="dropdown-item" href="#">${branchName}</a>`;
            listItem.addEventListener('click', function () {
                selectedBranch = branchName;
                fetchDataByBranch(branchName);
                branchDropdownButton.innerText = selectedBranch;
            });
            branchDropdown.appendChild(listItem);
        });
    }

    function fetchDataByBranch(branchName) {
        const environments = Object.values(envData);
        filteredEnvironments = environments.filter(env => env.branch_name === branchName);
        if (!Array.isArray(filteredEnvironments)) {
            throw new Error('Filtered environments is not an array');
        }

        generateCards(filteredEnvironments);
    }

    async function fetchData() {
        try {
            const response = await fetch('/get_master_data');
            if (!response.ok) {
                throw new Error('Network response failed');
            }
            const data = await response.json();
            // console.log(data.environments.length);
            envData = data.environments;
            filteredEnvironments = envData;

            generateCards(envData);
            populateBranchDropdown();

            countEnvironmentsByStatus(filteredEnvironments);
        } catch (error) {
            console.error('Failed to fetch data', error);
        }
    }

    function generateCards(environments) {
        console.log('Generating cards');
        cardContainer.innerHTML = '';
        let filteredEnv = [];
        if (dbType === 'all') {
            filteredEnv = Object.values(environments);
        } else if (dbType === 'exa') {
            filteredEnv = Object.values(environments).filter(env => env.db_type === "EXA-DB");
        } else if (dbType === 'non_exa') {
            filteredEnv = Object.values(environments).filter(env => env.db_type !== "EXA-DB");
        } else if (dbType === 'prod_like') {
            filteredEnv = Object.values(environments).filter(env => env.env_type === "Prod-like");
        } else if (dbType === 'pinned') {
            filteredEnv = Object.values(environments).filter(env => pinnedEnvironments.includes(env.env_name));
        }
        if (selectedStatus !== 'all') {
            filteredEnv = filteredEnv.filter(env => env.status.toLowerCase() === selectedStatus.replaceAll("-", " "));
        }
        // console.log(allApps);
        console.log(filteredEnv);

        Object.values(filteredEnv).forEach(env => {
            let card;
            // card = createCard(app);
            card = createCard(env);
            cardContainer.appendChild(card);
        });

        const totalCards = Object.keys(envData).length;
        const dummyCardCount = Math.max(0, 5 - totalCards);
        for (let i = 0; i < dummyCardCount; i++) {
            const dummyCard = createDummyCard();
            cardContainer.appendChild(dummyCard);
        }

        initializeExpandIcons();
    }

    function initializeExpandIcons() {
        const expandIcons = document.querySelectorAll('.expand');
        expandIcons.forEach(icon => {
            icon.addEventListener('click', function () {
                const environmentName = this.closest('.card').querySelector('.build-number').innerText;
                currentEnvironmentName = environmentName;
                console.log("Current Environment Name: " + currentEnvironmentName);
                initializeModal();
            });
        });
    }

    function initializeModal() {
        // console.log("inside initializeModal with data: " + JSON.stringify(selectedJson));
        const currentEnvironment = Object.values(envData).find(env => env.env_name === currentEnvironmentName);
        selectedEnv = Object.values(envData).find(env => env.env_name === currentEnvironmentName);
        // console.log(selectedEnv);
        let modalHeaderClass = '';
        if (currentEnvironment && currentEnvironment.status) {
            modalHeaderClass = currentEnvironment.status === 'Allocation Ended' ? 'status-red' :
                currentEnvironment.status === 'Allocation Ends Soon' ? 'status-orange' :
                    currentEnvironment.status === 'In Pool' ? 'status-green' :
                        currentEnvironment.status === 'Allocated' ? 'status-blue' : 'status-gray';
        }

        document.getElementById('staticBackdropLabel').innerText = currentEnvironmentName;

        const modalHeader = document.querySelector('#staticBackdrop .modal-header');
        if (modalHeader) {
            modalHeader.className = `modal-header ${modalHeaderClass} custom-modal-header`;
        }

        initializeDataTable(selectedEnv);
    }

    function initializeDataTable(data) {
        console.log(data);

        const detailsData = data.details ? [data.details] : [];

        if (dataTableInstance) {
            dataTableInstance.clear();
            dataTableInstance.rows.add(detailsData);
            dataTableInstance.draw();
        } else {
            dataTableInstance = $('#example').DataTable({
                data: detailsData,
                columns: [
                    {
                        className: 'details-control',
                        orderable: false,
                        data: null,
                        defaultContent: ''
                    },
                    { data: 'hostname', title: 'Hostname' },
                    { data: 'cpu', title: 'CPU' },
                    { data: 'memory', title: 'Memory' },
                    { data: 'disk_volume', title: 'Disk Volume' }
                ],
                language: {
                    emptyTable: "No data available"
                }
            });

            $('#example tbody').on('click', 'td.details-control', function () {
                const tr = $(this).closest('tr');
                const row = dataTableInstance.row(tr);

                if (row.child.isShown()) {
                    row.child.hide();
                    tr.removeClass('shown');
                } else {
                    row.child(format(row.data())).show();
                    tr.addClass('shown');
                }
            });
        }
    }

    function format(d) {
        let table = '<table class="child-table" cellpadding="5" cellspacing="0" border="0" style="padding-left:50px;">';
        table += '<tr><th>Components</th></tr>';
    
        if (d.components && d.components.length > 0) {
            const componentList = d.components.join(', ');
            table += `<tr>
                        <td>${componentList}</td>
                      </tr>`;
        } else {
            table += '<tr><td>No components information available</td></tr>';
        }
    
        table += '</table>';
        return table;
    }
    

    function createCard(env) {
        console.log(env);
        const card = document.createElement('div');
        card.className = 'col';

        const headerClass = env.status === 'Allocation Ended' ? 'status-red' :
            env.status === 'Allocation Ends Soon' ? 'status-orange' :
                env.status === 'In Pool' ? 'status-green' :
                    env.status === 'Allocated' ? 'status-blue' : 'status-gray';

        const statusIcon = env.status === 'Allocation Ended' ? 'icons8-error.png' :
            env.status === 'In Pool' ? 'pool.png' :
                env.status === 'Allocation Ends Soon' ? 'icons8-warning.png' :
                    env.status === 'Allocated' ? 'icons8-check-mark-48.png' : '';

        const statusTextColor = env.status === 'Allocation Ended' ? 'red' :
            env.status === 'In Pool' ? 'green' :
                env.status === 'Allocation Ends Soon' ? 'orange' :
                    env.status === 'Allocated' ? 'blue' : '';

        const cardContent = `
            <div class="card" id="${env.env_name}">
                <div class="header ${headerClass}">
                    <div class="header-info">
                        <div class="build-number">
                            ${env.env_name}
                        </div>
                    </div>
                    <div class="status">
                        <img class="status-icon" src="static/images/${statusIcon}" alt="status">
                    </div>
                </div>
                <div class="body">
                    <p>Branch: ${env.branch_name}</p>
                    <h4><span class="status-text-${statusTextColor}"> ${env.status}</span></h4>
                    <p>Owner: ${env.owner_name}</p>
                    <p>Purpose: ${env.purpose}</p>
                    <p>End-Date: <span class="end-date">${env.end_date}<span></p>
                    <img class="expand"
                        src="static/images/icons8-external-link-48(1).png" 
                        data-bs-toggle="modal" data-bs-target="#staticBackdrop">
                </div>
            </div>
        `;

        card.innerHTML = cardContent;
        return card;
    }

    function createDummyCard() {
        const card = document.createElement('div');
        card.className = 'col';

        const cardContent = `
            <div class="card">
                <div class="header status-gray">
                    <div class="header-info">
                        <div class="build-number">
                            ---
                        </div>
                    </div>
                    <div class="status">
                        <img class="status-icon" src="static/images/icons8-warning.png" alt="status">
                    </div>
                </div>
                <div class="body">
                    <h4>Status:<span class="stat-text-WIP"> WIP</span></h4>
                    <p>Components: 0</p>
                    <p>Services: None</p>
                    <img class="expand" src="static/images/icons8-external-link-48(1).png">
                </div>
            </div>
        `;

        card.innerHTML = cardContent;
        return card;
    }

    function countEnvironmentsByStatus(environments) {
        console.log(environments);
        const counts = {
            'allocated': 0,
            'allocation ends soon': 0,
            'allocation ended': 0,
            'in pool': 0
        };

        Object.values(environments).forEach(env => {
            const status = env.status.toLowerCase();
            if (counts.hasOwnProperty(status)) {
                counts[status]++;
            }
        });

        console.log(counts);

        document.querySelector('.status-allocated-dot').innerText = counts.allocated;
        document.querySelector('.status-allocation-ends-soon-dot').innerText = counts['allocation ends soon'];
        document.querySelector('.status-allocation-ended-dot').innerText = counts['allocation ended'];
        document.querySelector('.status-in-pool-dot').innerText = counts['in pool'];

        updateSelectedFilter(); // Update the selected filter
    }

    function updateSelectedFilter() {
        const selectedFilterDiv = document.querySelector('.selected-filter');
        if (selectedStatus !== 'all') {
            console.log(selectedStatus);
            const filterClass = `filter-${selectedStatus.replaceAll(' ', '-')}`;
            selectedFilterDiv.className = `selected-filter ${filterClass}`;
            selectedFilterDiv.style.display = 'flex';
        } else {
            selectedFilterDiv.style.display = 'none';
        }
    }

    function resetSelectedStatus(){
        selectedStatus = 'all';
        updateSelectedFilter();
        countEnvironmentsByStatus(envData);
        generateCards(envData);
    }

    document.querySelector('.selected-filter').addEventListener('click', resetSelectedStatus);


    dropdownItems.forEach(item => {
        item.addEventListener('click', function () {
            selectedStatus = this.querySelector('.status-name').innerText.toLowerCase();
            console.log(selectedStatus);
            updateSelectedFilter();
            generateCards(envData);
        })
    })

    envForm.addEventListener('submit', function (event) {
        event.preventDefault();
        event.stopImmediatePropagation();
        environmentName = searchInput.value.trim();

        console.log("environmentName = " + environmentName);
        const environment = Object.values(envData).find(env => env.env_name.toLowerCase() === environmentName.toLowerCase());

        if (!environmentName || environmentName === '') {
            alert('Please enter env name');
        } else if (!environment) {
            alert('Environment not found');
            return;
        } else if (environment.maintenance === 'yes') {
            // If the environment status is 'maintenance', do not proceed with displaying the modal
            // console.log("inside maintenance mode");
            alert('Environment is in maintenance mode. Cannot display details.');
            return;
        }


        currentEnvironmentName = environment.env_name;
        filename = `file/${environment.env_name}.json`;
        // console.log(filename);

        initializeModal();
        $('#staticBackdrop').modal('show'); // Show the modal

    });

    // refreshBtn.addEventListener('click', fetchData);
    fetchData();
});
